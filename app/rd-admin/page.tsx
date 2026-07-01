export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import OverviewCharts, {
  type MonthlyPoint,
  type StatusPoint,
} from '@/components/admin/OverviewCharts'
import { formatAmount } from '@/lib/format'

// ── helpers ────────────────────────────────────────────────────────────────

function buildMonths(n = 12) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }
  })
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B',
  paid:      '#1D9E75',
  overdue:   '#EF4444',
  cancelled: '#9CA3AF',
  draft:     '#93C5FD',
}

// ── page ───────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  // Parallel data fetch
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { data: profiles },
    { data: invoices },
    { data: quotes },
    { data: activeInvUsers },
    { data: activeQuoteUsers },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('id, full_name, business_name, created_at'),
    admin.from('invoices').select('id, user_id, total, status, created_at, updated_at, inv_number, client_name'),
    admin.from('quotes').select('id, user_id, created_at, status'),
    admin.from('invoices').select('user_id').gte('created_at', thirtyDaysAgo),
    admin.from('quotes').select('user_id').gte('created_at', thirtyDaysAgo),
  ])

  const allInvoices = (invoices ?? []) as {
    id: string; user_id: string; total: number; status: string
    created_at: string; updated_at: string; inv_number: string; client_name: string
  }[]
  const allQuotes = (quotes ?? []) as { id: string; user_id: string; created_at: string; status: string }[]
  const allProfiles = (profiles ?? []) as { id: string; full_name: string | null; business_name: string | null; created_at: string }[]

  // Hero metrics
  const activeUserIds = new Set([
    ...(activeInvUsers ?? []).map((r: { user_id: string }) => r.user_id),
    ...(activeQuoteUsers ?? []).map((r: { user_id: string }) => r.user_id),
  ])
  const activeThisMonth   = activeUserIds.size
  const totalInvoicesVal  = allInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const paidInvoicesVal   = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)

  // Chart data
  const months = buildMonths(12)

  // User growth (cumulative)
  const userGrowth: MonthlyPoint[] = (() => {
    const counts = new Map<string, number>()
    allProfiles.forEach(p => {
      const k = monthKey(p.created_at)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    })
    let cumulative = 0
    return months.map(m => {
      cumulative += counts.get(m.key) ?? 0
      return { month: m.label, count: cumulative }
    })
  })()

  // Invoice + quote volume
  const invoiceVolume: MonthlyPoint[] = (() => {
    const invMap = new Map<string, number>()
    const quoteMap = new Map<string, number>()
    allInvoices.forEach(i => {
      const k = monthKey(i.created_at)
      invMap.set(k, (invMap.get(k) ?? 0) + 1)
    })
    allQuotes.forEach(q => {
      const k = monthKey(q.created_at)
      quoteMap.set(k, (quoteMap.get(k) ?? 0) + 1)
    })
    return months.map(m => ({
      month: m.label,
      invoices: invMap.get(m.key) ?? 0,
      quotes:   quoteMap.get(m.key) ?? 0,
    }))
  })()

  // Revenue per month
  const revenue: MonthlyPoint[] = (() => {
    const map = new Map<string, number>()
    allInvoices.forEach(i => {
      const k = monthKey(i.created_at)
      map.set(k, (map.get(k) ?? 0) + (i.total ?? 0))
    })
    return months.map(m => ({ month: m.label, value: Math.round(map.get(m.key) ?? 0) }))
  })()

  // Status breakdown
  const statusMap = new Map<string, number>()
  allInvoices.forEach(i => statusMap.set(i.status, (statusMap.get(i.status) ?? 0) + 1))
  const statusBreakdown: StatusPoint[] = Array.from(statusMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? '#9CA3AF' }))

  // Recent activity feed (last 20 events)
  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  const recentInvoices = [...allInvoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12)
    .map(inv => {
      const p = profileMap.get(inv.user_id)
      return {
        type: 'invoice_created' as const,
        user: p?.full_name || p?.business_name || 'Unknown',
        detail: `${inv.inv_number} · ${inv.client_name}`,
        amount: inv.total,
        ts: inv.created_at,
      }
    })

  const recentUsers = [...allProfiles]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map(p => ({
      type: 'user_signup' as const,
      user: p.full_name || p.business_name || 'Unknown',
      detail: 'Signed up',
      amount: null as number | null,
      ts: p.created_at,
    }))

  const activity = [...recentInvoices, ...recentUsers]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 20)

  const metrics = [
    { label: 'Total users',         value: (totalUsers ?? 0).toLocaleString() },
    { label: 'Active this month',   value: activeThisMonth.toLocaleString() },
    { label: 'Total invoices',      value: allInvoices.length.toLocaleString() },
    { label: 'Total quotes',        value: allQuotes.length.toLocaleString() },
    { label: 'Total invoiced',      value: formatAmount(totalInvoicesVal, 'NGN') },
    { label: 'Paid invoices value', value: formatAmount(paidInvoicesVal, 'NGN'), green: true },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {metrics.map(m => (
          <div
            key={m.label}
            className="bg-white rounded-xl px-4 py-3"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{m.label}</p>
            <p className={`text-base font-bold ${m.green ? 'text-brand' : 'text-gray-900'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8">
        <OverviewCharts
          userGrowth={userGrowth}
          invoiceVolume={invoiceVolume}
          revenue={revenue}
          statusBreakdown={statusBreakdown}
        />
      </div>

      {/* Recent activity */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-black/[0.04]">
          {activity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: item.type === 'user_signup' ? '#1D9E75' : '#0F6E56', fontSize: 11 }}
              >
                {item.type === 'user_signup' ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.user}</p>
                <p className="text-xs text-gray-400 truncate">{item.detail}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {item.amount != null && (
                  <p className="text-xs font-semibold text-gray-700">
                    {formatAmount(item.amount, 'NGN')}
                  </p>
                )}
                <p className="text-[11px] text-gray-400">{fmtDate(item.ts)}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
