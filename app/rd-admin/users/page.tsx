import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import AdminUsersClient, { type AdminUser } from '@/components/admin/AdminUsersClient'

export default async function AdminUsersPage() {
  const admin = createAdminClient()
  const supabase = createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser!.id)
    .single()

  // Fetch all auth users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  // Fetch profiles
  const { data: profiles } = await admin.from('profiles')
    .select('id, full_name, business_name, role, created_at, suspended_at')

  // Invoice aggregates per user
  const { data: invoiceRows } = await admin.from('invoices')
    .select('user_id, total, status, created_at')

  // Quote counts per user
  const { data: quoteRows } = await admin.from('quotes')
    .select('user_id, created_at')

  // Build maps
  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null; role: string; created_at: string; suspended_at: string | null }) => [p.id, p]))

  const invByUser = new Map<string, { count: number; total: number; paid: number; last: string }>()
  for (const r of (invoiceRows ?? [])) {
    const existing = invByUser.get(r.user_id) ?? { count: 0, total: 0, paid: 0, last: '' }
    existing.count++
    existing.total += r.total ?? 0
    if (r.status === 'paid') existing.paid += r.total ?? 0
    if (!existing.last || r.created_at > existing.last) existing.last = r.created_at
    invByUser.set(r.user_id, existing)
  }

  const quoteByUser = new Map<string, { count: number; last: string }>()
  for (const r of (quoteRows ?? [])) {
    const existing = quoteByUser.get(r.user_id) ?? { count: 0, last: '' }
    existing.count++
    if (!existing.last || r.created_at > existing.last) existing.last = r.created_at
    quoteByUser.set(r.user_id, existing)
  }

  const users: AdminUser[] = authUsers.map(au => {
    const p = profileMap.get(au.id)
    const inv = invByUser.get(au.id)
    const quo = quoteByUser.get(au.id)
    const lastInv  = inv?.last ?? null
    const lastQuo  = quo?.last ?? null
    const lastActive = lastInv && lastQuo
      ? (lastInv > lastQuo ? lastInv : lastQuo)
      : lastInv ?? lastQuo

    return {
      id:            au.id,
      email:         au.email ?? '',
      full_name:     p?.full_name ?? null,
      business_name: p?.business_name ?? null,
      role:          p?.role ?? 'user',
      created_at:    au.created_at,
      suspended_at:  p?.suspended_at ?? null,
      invoice_count: inv?.count ?? 0,
      quote_count:   quo?.count ?? 0,
      total_value:   inv?.total ?? 0,
      paid_value:    inv?.paid ?? 0,
      last_active:   lastActive,
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered accounts</p>
        </div>
      </div>
      <AdminUsersClient
        users={users}
        currentUserId={currentUser!.id}
        currentRole={myProfile?.role ?? 'admin'}
      />
    </div>
  )
}
