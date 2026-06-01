import { createAdminClient } from '@/lib/supabase/admin'
import AdminInvoicesClient from '@/components/admin/AdminInvoicesClient'

export default async function AdminInvoicesPage() {
  const admin = createAdminClient()

  const [{ data: invoices }, { data: profiles }] = await Promise.all([
    admin.from('invoices').select('id, user_id, inv_number, client_name, service_name, total, currency, status, created_at, renewal_date').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, business_name'),
  ])

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]))

  const rows = (invoices ?? []).map((inv: {
    id: string; user_id: string; inv_number: string; client_name: string; service_name: string | null
    total: number; currency: string | null; status: string; created_at: string; renewal_date: string | null
  }) => {
    const p = profileMap.get(inv.user_id)
    return {
      ...inv,
      created_by: p?.business_name || p?.full_name || '—',
      currency: inv.currency ?? 'NGN',
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">All Invoices</h1>
      <AdminInvoicesClient invoices={rows} />
    </div>
  )
}
