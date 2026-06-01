import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can change roles' }, { status: 403 })
  }

  if (params.id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const { role } = await req.json()
  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = createAdminClient()

  await admin.from('profiles').update({ role }).eq('id', params.id)

  // Audit log
  await admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'role_change',
    target_user_id: params.id,
    metadata: { new_role: role },
  })

  return NextResponse.json({ ok: true })
}
