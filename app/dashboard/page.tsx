import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MetricCard from '@/components/MetricCard'
import InvoiceRow from '@/components/InvoiceRow'
import { formatAmount } from '@/lib/format'
import type { Invoice } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: invoices }, { data: quotes }] = await Promise.all([
    supabase.from('profiles').select('full_name, currency').eq('id', user!.id).single(),
    supabase.from('invoices').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, status, total, valid_until').eq('user_id', user!.id),
  ])

  const allInvoices: Invoice[] = (invoices as Invoice[]) ?? []
  const currency    = profile?.currency ?? 'NGN'
  const displayName = profile?.full_name || user!.email?.split('@')[0] || 'User'

  const totalCount     = allInvoices.length
  const activeInvoices = allInvoices.filter((i) => i.status !== 'draft')
  const outstanding    = activeInvoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const collected      = activeInvoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.total, 0)
  const overdueCount   = activeInvoices.filter((i) => i.status === 'overdue').length
  const draftsCount    = allInvoices.filter((i) => i.status === 'draft').length

  // Quotes metrics
  const allQuotes        = (quotes ?? []) as { id: string; status: string; total: number; valid_until: string | null }[]
  const pendingQuotes    = allQuotes.filter((q) => q.status === 'sent' || q.status === 'approved').length
  const convertedQuotes  = allQuotes.filter((q) => q.status === 'converted').length

  const recent = allInvoices.slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your renewals.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/quotes/new"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white border border-black/10 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            New quote
          </Link>
          <Link
            href="/dashboard/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New renewal
          </Link>
        </div>
      </div>

      {/* Metric cards — invoices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MetricCard label="Total invoices" value={totalCount} />
        <MetricCard
          label="Outstanding"
          value={formatAmount(outstanding, currency)}
          sub="Pending + overdue"
        />
        <MetricCard
          label="Collected"
          value={formatAmount(collected, currency)}
          sub="All paid invoices"
          green
        />
        <MetricCard label="Overdue" value={overdueCount} sub="Need attention" />
      </div>

      {/* Metric cards — quotes */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/dashboard/quotes" className="group">
          <div
            className="bg-white rounded-xl px-4 py-3 group-hover:shadow-md transition-shadow"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Pending quotes</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{pendingQuotes}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Awaiting approval</p>
          </div>
        </Link>
        <Link href="/dashboard/quotes?tab=converted" className="group">
          <div
            className="bg-white rounded-xl px-4 py-3 group-hover:shadow-md transition-shadow"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Converted quotes</p>
            <p className="mt-0.5 text-lg font-bold text-brand">{convertedQuotes}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Turned into invoices</p>
          </div>
        </Link>
      </div>

      {/* Drafts call-out */}
      {draftsCount > 0 && (
        <Link
          href="/dashboard/invoices"
          className="flex items-center gap-2 px-4 py-2.5 mb-6 rounded-xl text-sm transition-opacity hover:opacity-80"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
          <span className="font-medium text-blue-700">
            {draftsCount} draft {draftsCount === 1 ? 'invoice' : 'invoices'} — complete before sending
          </span>
          <span className="ml-auto text-blue-400 text-xs font-medium">View →</span>
        </Link>
      )}

      {/* Recent invoices */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-sm font-semibold text-gray-900">Recent invoices</h2>
          {allInvoices.length > 0 && (
            <Link
              href="/dashboard/invoices"
              className="text-xs text-brand hover:text-brand-dark font-medium transition-colors"
            >
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No invoices yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first renewal invoice to get started.</p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              Create first invoice
            </Link>
          </div>
        ) : (
          <div>
            {recent.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} readonly />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
