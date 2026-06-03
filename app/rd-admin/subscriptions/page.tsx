import { createAdminClient } from '@/lib/supabase/admin'

function fmtCurrency(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : '₦'
  return `${symbol}${amount.toLocaleString()}`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AMOUNTS = {
  pro: { NGN: { monthly: 5000, yearly: 45000 }, USD: { monthly: 5, yearly: 50 } },
  agency: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 150 } },
} as const

function planAmount(planName: string, currency: string, interval: string): number {
  if (planName === 'starter') return 0
  const p = AMOUNTS[planName as 'pro' | 'agency']
  if (!p) return 0
  const c = p[currency as 'NGN' | 'USD']
  if (!c) return 0
  return interval === 'yearly' ? c.yearly : c.monthly
}

export default async function AdminSubscriptionsPage() {
  const admin = createAdminClient()

  const [{ data: subs }, { data: profiles }, { count: totalUsers }] = await Promise.all([
    admin
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, business_name, created_at'),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const activePaying = (subs ?? []).filter(
    s => s.status === 'active' && s.plan_name !== 'starter'
  )

  const mrrNGN = activePaying
    .filter(s => s.billing_currency === 'NGN' && s.billing_interval === 'monthly')
    .reduce((acc, s) => acc + planAmount(s.plan_name, 'NGN', 'monthly'), 0)
  const mrrUSD = activePaying
    .filter(s => s.billing_currency === 'USD' && s.billing_interval === 'monthly')
    .reduce((acc, s) => acc + planAmount(s.plan_name, 'USD', 'monthly'), 0)

  // Convert yearly to monthly equivalent
  const mrrFromYearlyNGN = activePaying
    .filter(s => s.billing_currency === 'NGN' && s.billing_interval === 'yearly')
    .reduce((acc, s) => acc + planAmount(s.plan_name, 'NGN', 'yearly') / 12, 0)
  const mrrFromYearlyUSD = activePaying
    .filter(s => s.billing_currency === 'USD' && s.billing_interval === 'yearly')
    .reduce((acc, s) => acc + planAmount(s.plan_name, 'USD', 'yearly') / 12, 0)

  const totalMRR_NGN = mrrNGN + mrrFromYearlyNGN
  const totalMRR_USD = mrrUSD + mrrFromYearlyUSD

  const freeCount = (totalUsers ?? 0) - activePaying.length
  const conversionRate = totalUsers ? ((activePaying.length / totalUsers) * 100).toFixed(1) : '0'

  const thisMonth = new Date().toISOString().slice(0, 7)
  const churnCount = (subs ?? []).filter(
    s => s.status === 'cancelled' && s.cancelled_at?.startsWith(thisMonth)
  ).length

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    past_due: 'bg-amber-100 text-amber-700',
    trialing: 'bg-blue-100 text-blue-700',
  }

  const metrics = [
    { label: 'Paying users', value: activePaying.length },
    { label: 'MRR (NGN)', value: `₦${Math.round(totalMRR_NGN).toLocaleString()}` },
    { label: 'MRR (USD)', value: `$${Math.round(totalMRR_USD).toLocaleString()}` },
    { label: 'ARR (NGN)', value: `₦${Math.round(totalMRR_NGN * 12).toLocaleString()}` },
    { label: 'Free users', value: freeCount },
    { label: 'Conversion rate', value: `${conversionRate}%` },
    { label: 'Churn this month', value: churnCount },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Subscriptions</h1>
        <p className="text-sm text-white/50 mt-0.5">Subscription metrics and all user plans</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        {metrics.map(m => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-white/40 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['User', 'Plan', 'Interval', 'Currency', 'Amount', 'Status', 'Next billing', 'Joined'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map(sub => {
              const profile = profileMap.get(sub.user_id)
              const amount = planAmount(sub.plan_name, sub.billing_currency, sub.billing_interval)
              return (
                <tr
                  key={sub.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 text-white">
                    <p className="font-medium truncate max-w-[140px]">
                      {profile?.business_name ?? profile?.full_name ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-white/70">{sub.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50 capitalize">{sub.billing_interval}</td>
                  <td className="px-4 py-3 text-white/50">{sub.billing_currency}</td>
                  <td className="px-4 py-3 text-white/70">
                    {amount > 0 ? fmtCurrency(amount, sub.billing_currency) : 'Free'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{fmtDate(sub.current_period_end)}</td>
                  <td className="px-4 py-3 text-white/40">{fmtDate(sub.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!subs || subs.length === 0) && (
          <div className="py-12 text-center text-white/30 text-sm">No subscriptions yet.</div>
        )}
      </div>
    </div>
  )
}
