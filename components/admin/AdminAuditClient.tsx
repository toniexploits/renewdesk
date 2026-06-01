'use client'

import { useState, useMemo } from 'react'

interface AuditRow {
  id: string
  admin_name: string
  action: string
  target: string
  metadata: Record<string, unknown>
  created_at: string
}

const ACTION_STYLE: Record<string, string> = {
  role_change:   'bg-blue-50 text-blue-700',
  grant_admin:   'bg-blue-50 text-blue-700',
  revoke_admin:  'bg-purple-50 text-purple-700',
  suspend:       'bg-amber-100 text-amber-700',
  unsuspend:     'bg-green-50 text-green-700',
  delete_user:   'bg-red-50 text-red-700',
}

const ACTION_LABEL: Record<string, string> = {
  role_change:   'Role change',
  grant_admin:   'Grant admin',
  revoke_admin:  'Revoke admin',
  suspend:       'Suspend',
  unsuspend:     'Unsuspend',
  delete_user:   'Delete user',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function metaDetail(action: string, metadata: Record<string, unknown>) {
  if (action === 'role_change' && metadata.new_role) return `→ ${metadata.new_role}`
  if (action === 'grant_admin' && metadata.email)    return String(metadata.email)
  return JSON.stringify(metadata) === '{}' ? '—' : JSON.stringify(metadata)
}

const ACTION_FILTERS = ['all', 'role_change', 'grant_admin', 'revoke_admin', 'suspend', 'delete_user'] as const

export default function AdminAuditClient({ logs }: { logs: AuditRow[] }) {
  const [actionFilter, setActionFilter] = useState<typeof ACTION_FILTERS[number]>('all')
  const [adminSearch, setAdminSearch]   = useState('')

  const filtered = useMemo(() => {
    const q = adminSearch.toLowerCase()
    return logs.filter(l => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false
      if (q && !l.admin_name.toLowerCase().includes(q) && !l.target.toLowerCase().includes(q)) return false
      return true
    })
  }, [logs, actionFilter, adminSearch])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={adminSearch}
            onChange={e => setAdminSearch(e.target.value)}
            placeholder="Filter by admin or target user…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value as typeof ACTION_FILTERS[number])}
          className="text-sm border border-black/10 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
        >
          {ACTION_FILTERS.map(f => (
            <option key={f} value={f}>{f === 'all' ? 'All actions' : ACTION_LABEL[f] ?? f}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} log entr{filtered.length !== 1 ? 'ies' : 'y'}</p>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
              {['Admin', 'Action', 'Target', 'Details', 'Timestamp'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {filtered.map((log, i) => (
              <tr key={log.id} style={i % 2 === 1 ? { background: '#FAFAFA' } : {}}>
                <td className="px-4 py-3 font-medium text-gray-800">{log.admin_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_STYLE[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{log.target}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{metaDetail(log.action, log.metadata)}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(log.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No audit logs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
