import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(myProfile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.id === user.id) {
    return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('suspended_at').eq('id', params.id).single()
  const suspended_at = target?.suspended_at ? null : new Date().toISOString()

  await admin.from('profiles').update({ suspended_at }).eq('id', params.id)

  await admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: suspended_at ? 'suspend' : 'unsuspend',
    target_user_id: params.id,
    metadata: {},
  })

  return NextResponse.json({ ok: true, suspended: !!suspended_at })
}
