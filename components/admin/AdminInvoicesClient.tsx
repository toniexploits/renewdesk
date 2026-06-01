'use client'

import { useState, useMemo } from 'react'
import { formatAmount } from '@/lib/format'

interface InvoiceRow {
  id: string
  inv_number: string
  client_name: string
  created_by: string
  service_name: string | null
  total: number
  currency: string
  status: string
  created_at: string
  renewal_date: string | null
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-blue-50 text-blue-700',
  pending:   'bg-amber-100 text-amber-800',
  paid:      'bg-[#E1F5EE] text-[#085041]',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PAGE_SIZE = 25
const STATUS_FILTERS = ['all', 'pending', 'paid', 'overdue', 'draft', 'cancelled'] as const
type DateFilter = 'all' | '7d' | '30d' | '90d'
const DATE_MS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

export default function AdminInvoicesClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<typeof STATUS_FILTERS[number]>('all')
  const [dateRange, setDate]  = useState<DateFilter>('all')
  const [page, setPage]       = useState(1)

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = search.toLowerCase()
    return invoices.filter(inv => {
      if (q && !inv.inv_number.toLowerCase().includes(q)
             && !inv.client_name.toLowerCase().includes(q)
             && !inv.created_by.toLowerCase().includes(q)) return false
      if (status !== 'all' && inv.status !== status) return false
      if (dateRange !== 'all') {
        const days = DATE_MS[dateRange]
        if (now - new Date(inv.created_at).getTime() > days * 86400000) return false
      }
      return true
    })
  }, [invoices, search, status, dateRange])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const totalValue = filtered.reduce((s, i) => s + i.total, 0)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by invoice #, client, or business…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as typeof STATUS_FILTERS[number]); setPage(1) }}
          className="text-sm border border-black/10 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
        >
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={dateRange}
          onChange={e => { setDate(e.target.value as DateFilter); setPage(1) }}
          className="text-sm border border-black/10 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg mb-4 bg-white text-sm" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <span className="text-gray-600">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-800">Total: {formatAmount(totalValue, 'NGN')}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
                {['Invoice #', 'Client', 'Created by', 'Service', 'Amount', 'Created', 'Due', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {paged.map((inv, i) => (
                <tr key={inv.id} style={i % 2 === 1 ? { background: '#FAFAFA' } : {}}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{inv.inv_number}</td>
                  <td className="px-4 py-3 text-gray-800">{inv.client_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.created_by}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.service_name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{formatAmount(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(inv.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{inv.renewal_date ? fmtDate(inv.renewal_date) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No invoices match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-xs text-gray-400">Page {safePage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >Prev</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
