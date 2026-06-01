import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin') return null
  return user
}

// GET — list current admins
export async function GET() {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles')
    .select('id, full_name, business_name, role, created_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  // Enrich with emails
  const result = await Promise.all(
    (profiles ?? []).map(async (p: { id: string; full_name: string | null; business_name: string | null; role: string; created_at: string }) => {
      const { data: { user: au } } = await admin.auth.admin.getUserById(p.id)
      return { ...p, email: au?.email ?? '' }
    })
  )

  return NextResponse.json(result)
}

// POST — grant admin by email
export async function POST(req: Request) {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const target = users.find(u => u.email === email)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.id === caller.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  await admin.from('profiles').update({ role: 'admin' }).eq('id', target.id)
  await admin.from('admin_audit_log').insert({
    admin_user_id: caller.id,
    action: 'grant_admin',
    target_user_id: target.id,
    metadata: { email },
  })

  return NextResponse.json({ ok: true })
}

// DELETE — revoke admin by userId in body
export async function DELETE(req: Request) {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (userId === caller.id) return NextResponse.json({ error: 'Cannot revoke own role' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('profiles').update({ role: 'user' }).eq('id', userId)
  await admin.from('admin_audit_log').insert({
    admin_user_id: caller.id,
    action: 'revoke_admin',
    target_user_id: userId,
    metadata: {},
  })

  return NextResponse.json({ ok: true })
}
