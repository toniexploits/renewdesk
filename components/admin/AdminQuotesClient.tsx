'use client'

import { useState, useMemo } from 'react'
import { formatAmount } from '@/lib/format'

interface QuoteRow {
  id: string
  quote_number: string
  client_name: string
  created_by: string
  service_name: string | null
  total: number
  currency: string
  status: string
  effectiveStatus: string
  created_at: string
  valid_until: string | null
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-blue-50 text-blue-700',
  sent:      'bg-purple-50 text-purple-700',
  approved:  'bg-[#E1F5EE] text-[#085041]',
  converted: 'bg-[#E1F5EE] text-[#085041]',
  expired:   'bg-red-50 text-red-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PAGE_SIZE = 25
const STATUS_FILTERS = ['all', 'draft', 'sent', 'approved', 'converted', 'expired'] as const

export default function AdminQuotesClient({ quotes }: { quotes: QuoteRow[] }) {
  const [search, setSearch]  = useState('')
  const [status, setStatus]  = useState<typeof STATUS_FILTERS[number]>('all')
  const [page, setPage]      = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return quotes.filter(r => {
      if (q && !r.quote_number.toLowerCase().includes(q)
             && !r.client_name.toLowerCase().includes(q)
             && !r.created_by.toLowerCase().includes(q)) return false
      if (status !== 'all' && r.effectiveStatus !== status) return false
      return true
    })
  }, [quotes, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const totalValue = filtered.reduce((s, q) => s + q.total, 0)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by quote #, client, or business…"
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
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg mb-4 bg-white text-sm" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <span className="text-gray-600">{filtered.length} quote{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-800">Total: {formatAmount(totalValue, 'NGN')}</span>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
                {['Quote #', 'Client', 'Created by', 'Service', 'Amount', 'Created', 'Valid until', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {paged.map((q, i) => (
                <tr key={q.id} style={i % 2 === 1 ? { background: '#FAFAFA' } : {}}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{q.quote_number}</td>
                  <td className="px-4 py-3 text-gray-800">{q.client_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{q.created_by}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{q.service_name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{formatAmount(q.total, q.currency)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(q.valid_until)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[q.effectiveStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {q.effectiveStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No quotes match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-xs text-gray-400">Page {safePage} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-black/10 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
