import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can delete accounts' }, { status: 403 })
  }

  if (params.id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete in order (cascade-safe)
  await admin.from('invoices').delete().eq('user_id', params.id)
  await admin.from('quotes').delete().eq('user_id', params.id)
  await admin.from('bank_accounts').delete().eq('user_id', params.id)

  // Audit before deleting the user
  await admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'delete_user',
    target_user_id: params.id,
    metadata: {},
  })

  await admin.auth.admin.deleteUser(params.id)

  return NextResponse.json({ ok: true })
}
