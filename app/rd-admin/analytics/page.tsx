import { createAdminClient } from '@/lib/supabase/admin'
import AnalyticsCharts, { type CurrencyBreakdown, type TopUser, type DayHeatmapEntry } from '@/components/admin/AnalyticsCharts'
import { formatAmount } from '@/lib/format'

const CURRENCY_COLORS = ['#1D9E75', '#0F6E56', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#9CA3AF']

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function pct(n: number, d: number) {
  if (!d) return '0%'
  return `${Math.round((n / d) * 100)}%`
}

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient()

  const now = new Date()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMEnd    = monthStart

  const [
    { data: invoices },
    { data: quotes },
    { data: profiles },
    { data: events },
  ] = await Promise.all([
    admin.from('invoices').select('id, user_id, total, status, currency, created_at'),
    admin.from('quotes').select('id, user_id, status, created_at'),
    admin.from('profiles').select('id, full_name, business_name, created_at'),
    admin.from('app_events').select('event_type, created_at'),
  ])

  const allInv  = (invoices ?? []) as { id: string; user_id: string; total: number; status: string; currency: string; created_at: string }[]
  const allQ    = (quotes ?? []) as { id: string; user_id: string; status: string; created_at: string }[]
  const allP    = (profiles ?? []) as { id: string; full_name: string | null; business_name: string | null; created_at: string }[]
  const allEv   = (events ?? []) as { event_type: string; created_at: string }[]

  // Section 1 — User engagement
  const uniqueInvUsers  = new Set(allInv.map(i => i.user_id)).size
  const uniqueQuoUsers  = new Set(allQ.map(q => q.user_id)).size
  const months          = buildMonths(12)

  const invMonthly = new Map<string, number>()
  allInv.forEach(i => invMonthly.set(monthKey(i.created_at), (invMonthly.get(monthKey(i.created_at)) ?? 0) + 1))
  const avgMonthlyInv = uniqueInvUsers > 0
    ? (allInv.length / Math.max(1, months.length) / Math.max(1, uniqueInvUsers)).toFixed(1)
    : '0'

  const avgMonthlyQuo = uniqueQuoUsers > 0
    ? (allQ.length / Math.max(1, months.length) / Math.max(1, uniqueQuoUsers)).toFixed(1)
    : '0'

  const convertedQ  = allQ.filter(q => q.status === 'converted').length
  const convRate    = pct(convertedQ, allQ.length)

  // Top 10 users by invoice count
  const invCountByUser = new Map<string, number>()
  allInv.forEach(i => invCountByUser.set(i.user_id, (invCountByUser.get(i.user_id) ?? 0) + 1))
  const profileMap = new Map(allP.map(p => [p.id, p]))
  const top10 = Array.from(invCountByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([uid, count]) => {
      const p = profileMap.get(uid)
      return { name: p?.full_name || p?.business_name || 'Unknown', count }
    })

  // Section 2 — Revenue insights
  const thisMonthInv = allInv.filter(i => i.created_at >= monthStart)
  const lastMonthInv = allInv.filter(i => i.created_at >= lastMStart && i.created_at < lastMEnd)
  const thisMTotal   = thisMonthInv.reduce((s, i) => s + i.total, 0)
  const lastMTotal   = lastMonthInv.reduce((s, i) => s + i.total, 0)
  const momChange    = lastMTotal > 0 ? Math.round(((thisMTotal - lastMTotal) / lastMTotal) * 100) : null

  const paidInv      = allInv.filter(i => i.status === 'paid')
  const paidRatio    = pct(paidInv.length, allInv.length)
  const avgInvValue  = allInv.length > 0 ? Math.round(allInv.reduce((s, i) => s + i.total, 0) / allInv.length) : 0

  // Currency breakdown
  const currMap = new Map<string, number>()
  allInv.forEach(i => currMap.set(i.currency ?? 'NGN', (currMap.get(i.currency ?? 'NGN') ?? 0) + 1))
  const currencyBreakdown: CurrencyBreakdown[] = Array.from(currMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: CURRENCY_COLORS[i % CURRENCY_COLORS.length] }))

  // Top 5 users by total value
  const invValueByUser = new Map<string, number>()
  allInv.forEach(i => invValueByUser.set(i.user_id, (invValueByUser.get(i.user_id) ?? 0) + i.total))
  const topUsers: TopUser[] = Array.from(invValueByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, total_value]) => {
      const p = profileMap.get(uid)
      return {
        name: (p?.full_name || p?.business_name || 'Unknown').split(' ')[0],
        total_value,
        invoice_count: invCountByUser.get(uid) ?? 0,
      }
    })

  // Day heatmap
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  allInv.forEach(i => { dayCounts[new Date(i.created_at).getDay()]++ })
  const dayHeatmap: DayHeatmapEntry[] = DAY_NAMES.map((day, i) => ({ day, count: dayCounts[i] }))

  // Month-over-month growth rates
  const buildMoM = (items: { created_at: string }[]) => {
    const m = buildMonths(3)
    return m.map((mo, idx) => {
      if (idx === 0) return null
      const cur  = items.filter(i => monthKey(i.created_at) === mo.key).length
      const prev = items.filter(i => monthKey(i.created_at) === m[idx - 1].key).length
      if (!prev) return null
      return Math.round(((cur - prev) / prev) * 100)
    }).filter(Boolean)
  }
  const invMoM    = buildMoM(allInv)[0]
  const userMoM   = buildMoM(allP.map(p => ({ created_at: p.created_at })))[0]
  const quoteMoM  = buildMoM(allQ)[0]

  // Feature usage
  const eventCounts = new Map<string, number>()
  allEv.forEach(e => eventCounts.set(e.event_type, (eventCounts.get(e.event_type) ?? 0) + 1))

  const statCard = (label: string, value: string | number, sub?: string, green?: boolean) => (
    <div className="bg-white rounded-xl px-4 py-4" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${green ? 'text-brand' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* Section 1 — User engagement */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest mb-4">User Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {statCard('Avg invoices / user / mo', avgMonthlyInv)}
          {statCard('Avg quotes / user / mo', avgMonthlyQuo)}
          {statCard('Quote conversion rate', convRate, `${convertedQ} of ${allQ.length} quotes`)}
          {statCard('Total active users', uniqueInvUsers, 'ever created an invoice')}
        </div>

        {/* Top 10 by invoice count */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-sm font-semibold text-gray-700">Most Active Users (by invoice count)</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FAFAFA' }}>
                <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">#</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">User</th>
                <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {top10.map((u, i) => (
                <tr key={u.name} style={i % 2 === 1 ? { background: '#FAFAFA' } : {}}>
                  <td className="px-5 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-2.5 text-gray-800">{u.name}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-brand">{u.count}</td>
                </tr>
              ))}
              {top10.length === 0 && <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2 — Revenue insights */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest mb-4">Revenue Insights</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {statCard('This month total', formatAmount(thisMTotal, 'NGN'), momChange != null ? `${momChange >= 0 ? '+' : ''}${momChange}% vs last month` : undefined, thisMTotal > lastMTotal)}
          {statCard('Last month total', formatAmount(lastMTotal, 'NGN'))}
          {statCard('Paid invoices %', paidRatio, `${paidInv.length} of ${allInv.length}`, true)}
          {statCard('Avg invoice value', formatAmount(avgInvValue, 'NGN'))}
        </div>
        <AnalyticsCharts currencyBreakdown={currencyBreakdown} topUsers={topUsers} dayHeatmap={dayHeatmap} />
      </section>

      {/* Section 3 — Time trends */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest mb-4">Month-over-Month Growth</h2>
        <div className="grid grid-cols-3 gap-3">
          {statCard('User growth (MoM)', invMoM != null ? `${invMoM >= 0 ? '+' : ''}${invMoM}%` : '—', 'vs previous month', (invMoM ?? 0) > 0)}
          {statCard('Invoice growth (MoM)', userMoM != null ? `${userMoM >= 0 ? '+' : ''}${userMoM}%` : '—', 'vs previous month', (userMoM ?? 0) > 0)}
          {statCard('Quote growth (MoM)', quoteMoM != null ? `${quoteMoM >= 0 ? '+' : ''}${quoteMoM}%` : '—', 'vs previous month', (quoteMoM ?? 0) > 0)}
        </div>
      </section>

      {/* Section 4 — Feature usage */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest mb-4">Feature Usage</h2>
        <div className="grid grid-cols-3 gap-3">
          {statCard('PDF downloads',   eventCounts.get('pdf_download')  ?? 0)}
          {statCard('WhatsApp sends',  eventCounts.get('whatsapp_send') ?? 0)}
          {statCard('Email sends',     eventCounts.get('email_send')    ?? 0)}
        </div>
        {allEv.length === 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Feature tracking events will appear here once the <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">app_events</code> table is populated.
          </p>
        )}
      </section>
    </div>
  )
}
