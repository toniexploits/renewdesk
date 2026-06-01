import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) return null
  return user
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const { data: profiles } = await admin.from('profiles').select('id, full_name, business_name, role, created_at, suspended_at')
  const { data: invoiceRows } = await admin.from('invoices').select('user_id, total, status, created_at')
  const { data: quoteRows } = await admin.from('quotes').select('user_id, created_at')

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null; role: string; created_at: string; suspended_at: string | null }) => [p.id, p]))

  const invByUser = new Map<string, { count: number; total: number; paid: number; last: string }>()
  for (const r of (invoiceRows ?? [])) {
    const e = invByUser.get(r.user_id) ?? { count: 0, total: 0, paid: 0, last: '' }
    e.count++; e.total += r.total ?? 0
    if (r.status === 'paid') e.paid += r.total ?? 0
    if (!e.last || r.created_at > e.last) e.last = r.created_at
    invByUser.set(r.user_id, e)
  }

  const quoteByUser = new Map<string, { count: number; last: string }>()
  for (const r of (quoteRows ?? [])) {
    const e = quoteByUser.get(r.user_id) ?? { count: 0, last: '' }
    e.count++
    if (!e.last || r.created_at > e.last) e.last = r.created_at
    quoteByUser.set(r.user_id, e)
  }

  const users = authUsers.map(au => {
    const p = profileMap.get(au.id)
    const inv = invByUser.get(au.id)
    const quo = quoteByUser.get(au.id)
    const lastInv  = inv?.last ?? null
    const lastQuo  = quo?.last ?? null
    const lastActive = lastInv && lastQuo ? (lastInv > lastQuo ? lastInv : lastQuo) : lastInv ?? lastQuo
    return {
      id: au.id, email: au.email ?? '',
      full_name: p?.full_name ?? null, business_name: p?.business_name ?? null,
      role: p?.role ?? 'user', created_at: au.created_at,
      suspended_at: p?.suspended_at ?? null,
      invoice_count: inv?.count ?? 0, quote_count: quo?.count ?? 0,
      total_value: inv?.total ?? 0, paid_value: inv?.paid ?? 0,
      last_active: lastActive,
    }
  })

  return NextResponse.json(users)
}
