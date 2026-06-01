import { createAdminClient } from '@/lib/supabase/admin'
import AdminQuotesClient from '@/components/admin/AdminQuotesClient'

export default async function AdminQuotesPage() {
  const admin = createAdminClient()

  const [{ data: quotes }, { data: profiles }] = await Promise.all([
    admin.from('quotes').select('id, user_id, quote_number, client_name, service_name, total, currency, status, created_at, valid_until, converted_invoice_id').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, business_name'),
  ])

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]))
  const now = new Date()

  const rows = (quotes ?? []).map((q: {
    id: string; user_id: string; quote_number: string; client_name: string; service_name: string | null
    total: number; currency: string | null; status: string; created_at: string; valid_until: string | null; converted_invoice_id: string | null
  }) => {
    const p = profileMap.get(q.user_id)
    const expired = q.status !== 'converted' && q.valid_until && new Date(q.valid_until) < now
    return {
      ...q,
      created_by:   p?.business_name || p?.full_name || '—',
      currency:     q.currency ?? 'NGN',
      effectiveStatus: expired ? 'expired' : q.status,
    }
  })

  // Conversion rate this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonth = rows.filter(q => q.created_at >= monthStart)
  const converted = thisMonth.filter(q => q.status === 'converted').length
  const convRate  = thisMonth.length > 0 ? Math.round((converted / thisMonth.length) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">All Quotes</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Conversion rate (this month)</p>
          <p className="text-2xl font-bold text-brand">{convRate}%</p>
          <p className="text-xs text-gray-400">{converted} of {thisMonth.length} quotes converted</p>
        </div>
      </div>
      <AdminQuotesClient quotes={rows} />
    </div>
  )
}
