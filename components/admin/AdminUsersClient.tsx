'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatAmount } from '@/lib/format'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  business_name: string | null
  role: string
  created_at: string
  suspended_at: string | null
  invoice_count: number
  quote_count: number
  total_value: number
  paid_value: number
  last_active: string | null
}

interface SlideOverData extends AdminUser {
  recent_invoices: { id: string; inv_number: string; client_name: string; total: number; status: string; created_at: string }[]
  recent_quotes:   { id: string; quote_number: string; client_name: string; total: number; status: string; created_at: string }[]
}

const ROLE_BADGE: Record<string, React.CSSProperties> = {
  user:        { background: '#F1EFE8', color: '#444441' },
  admin:       { background: '#EFF6FF', color: '#1D4ED8' },
  super_admin: { background: '#E1F5EE', color: '#085041' },
}
const ROLE_LABEL: Record<string, string> = {
  user: 'User', admin: 'Admin', super_admin: 'Super Admin',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-blue-50 text-blue-700',
  pending:   'bg-amber-100 text-amber-800',
  paid:      'bg-[#E1F5EE] text-[#085041]',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  sent:      'bg-purple-50 text-purple-700',
  approved:  'bg-[#E1F5EE] text-[#085041]',
  converted: 'bg-[#E1F5EE] text-[#085041]',
}

// ── Action Menu ─────────────────────────────────────────────────────────────

function ActionMenu({
  user,
  currentUserId,
  isSuperAdmin,
  onRefresh,
  onViewDetails,
}: {
  user: AdminUser
  currentUserId: string
  isSuperAdmin: boolean
  onRefresh: () => void
  onViewDetails: (u: AdminUser) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isSelf = user.id === currentUserId

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function changeRole(newRole: string) {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/admin/users/${user.id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setLoading(false)
    onRefresh()
  }

  async function toggleSuspend() {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/admin/users/${user.id}/suspend`, { method: 'POST' })
    setLoading(false)
    onRefresh()
  }

  async function deleteUser() {
    const email = prompt(`Type "${user.email}" to confirm deletion:`)
    if (email !== user.email) return
    setLoading(true)
    await fetch(`/api/admin/users/${user.id}/delete`, { method: 'DELETE' })
    setLoading(false)
    onRefresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="p-1.5 rounded hover:bg-black/5 transition-colors text-gray-400 hover:text-gray-600"
        aria-label="Actions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5"  r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white rounded-lg py-1 z-50"
          style={{ border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          <button
            onClick={() => { onViewDetails(user); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >View details</button>

          {!isSelf && isSuperAdmin && (
            <>
              <div className="h-px bg-black/[0.06] my-1" />
              <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Change role</p>
              {['user', 'admin', 'super_admin'].filter(r => r !== user.role).map(r => (
                <button
                  key={r}
                  onClick={() => changeRole(r)}
                  className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Set as {ROLE_LABEL[r]}
                </button>
              ))}
            </>
          )}

          {!isSelf && (
            <>
              <div className="h-px bg-black/[0.06] my-1" />
              <button
                onClick={toggleSuspend}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                style={{ color: user.suspended_at ? '#1D9E75' : '#D97706' }}
              >
                {user.suspended_at ? 'Unsuspend account' : 'Suspend account'}
              </button>
              <button
                onClick={deleteUser}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete account
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Slide-over panel ────────────────────────────────────────────────────────

function UserSlideOver({
  user,
  onClose,
  currentUserId,
  isSuperAdmin,
  onRefresh,
}: {
  user: AdminUser | null
  onClose: () => void
  currentUserId: string
  isSuperAdmin: boolean
  onRefresh: () => void
}) {
  const [details, setDetails] = useState<SlideOverData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const id = user.id
    setDetails(null)
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => setDetails(d))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user) return null
  const data = details ?? { ...user, recent_invoices: [], recent_quotes: [] }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col bg-white overflow-hidden"
        style={{ width: 480, maxWidth: '100vw', boxShadow: '-8px 0 40px rgba(0,0,0,0.14)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <h2 className="text-base font-semibold text-gray-900">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* User info */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: user.suspended_at ? '#EF4444' : '#1D9E75' }}
            >
              {getInitials(user.full_name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.full_name || '—'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.business_name && <p className="text-sm text-gray-400">{user.business_name}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ROLE_BADGE[user.role]}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.suspended_at && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Suspended</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Joined {fmtDate(user.created_at)}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Invoices',     value: data.invoice_count },
              { label: 'Quotes',       value: data.quote_count },
              { label: 'Total billed', value: formatAmount(data.total_value, 'NGN') },
              { label: 'Paid value',   value: formatAmount(data.paid_value, 'NGN') },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-lg px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent invoices */}
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Invoices</p>
                {data.recent_invoices.length === 0 ? (
                  <p className="text-sm text-gray-400">None</p>
                ) : (
                  <div className="space-y-2">
                    {data.recent_invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{inv.inv_number} · {inv.client_name}</p>
                          <p className="text-xs text-gray-400">{fmtDate(inv.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">{formatAmount(inv.total, 'NGN')}</p>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_STYLE[inv.status] ?? ''}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Quotes</p>
                {data.recent_quotes.length === 0 ? (
                  <p className="text-sm text-gray-400">None</p>
                ) : (
                  <div className="space-y-2">
                    {data.recent_quotes.map(q => (
                      <div key={q.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{q.quote_number} · {q.client_name}</p>
                          <p className="text-xs text-gray-400">{fmtDate(q.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">{formatAmount(q.total, 'NGN')}</p>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_STYLE[q.status] ?? ''}`}>
                            {q.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {user.id !== currentUserId && (
          <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            {isSuperAdmin && (
              <select
                className="flex-1 text-sm border border-black/10 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-brand"
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value) return
                  await fetch(`/api/admin/users/${user.id}/role`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: e.target.value }),
                  })
                  onRefresh()
                  onClose()
                }}
              >
                <option value="" disabled>Change role…</option>
                {['user', 'admin', 'super_admin'].filter(r => r !== user.role).map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            )}
            <button
              onClick={async () => {
                await fetch(`/api/admin/users/${user.id}/suspend`, { method: 'POST' })
                onRefresh(); onClose()
              }}
              className="text-sm px-4 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              {user.suspended_at ? 'Unsuspend' : 'Suspend'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminUsersClient({
  users: initialUsers,
  currentUserId,
  currentRole,
}: {
  users: AdminUser[]
  currentUserId: string
  currentRole: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'admins'>('all')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSuperAdmin = currentRole === 'super_admin'

  // Debounced search
  const [displaySearch, setDisplaySearch] = useState('')
  const handleSearch = useCallback((val: string) => {
    setDisplaySearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(val.toLowerCase()), 300)
  }, [])

  async function refreshUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data: AdminUser[] = await res.json()
      setUsers(data)
    }
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const filtered = users.filter(u => {
    const q = search
    const matchesSearch = !q
      || u.full_name?.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || u.business_name?.toLowerCase().includes(q)

    let matchesFilter = true
    if (filter === 'active')   matchesFilter = !!u.last_active && new Date(u.last_active).getTime() > thirtyDaysAgo
    if (filter === 'inactive') matchesFilter = !u.last_active || new Date(u.last_active).getTime() <= thirtyDaysAgo
    if (filter === 'admins')   matchesFilter = u.role === 'admin' || u.role === 'super_admin'

    return matchesSearch && matchesFilter
  })

  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'active',   label: 'Active (30d)' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'admins',   label: 'Admins' },
  ] as const

  return (
    <>
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={displaySearch}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, email or business…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-lg p-1" style={{ border: '1px solid rgba(0,0,0,0.10)' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

      {/* Desktop table */}
      <div
        className="hidden md:block bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
              {['User', 'Business', 'Role', 'Joined', 'Last active', 'Inv / Quo', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                className="hover:bg-[#FAFAFA] transition-colors"
                style={u.suspended_at ? { background: '#FFF5F5' } : i % 2 === 1 ? { background: '#FAFAFA' } : {}}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: u.suspended_at ? '#EF4444' : '#1D9E75' }}
                    >
                      {getInitials(u.full_name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.business_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ROLE_BADGE[u.role]}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                  {u.suspended_at && (
                    <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Suspended</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.last_active)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{u.invoice_count} / {u.quote_count}</td>
                <td className="px-4 py-3">
                  <ActionMenu
                    user={u}
                    currentUserId={currentUserId}
                    isSuperAdmin={isSuperAdmin}
                    onRefresh={refreshUsers}
                    onViewDetails={setSelectedUser}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(u => (
          <div
            key={u.id}
            className="bg-white rounded-xl px-4 py-4"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              background: u.suspended_at ? '#FFF5F5' : '#fff',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: u.suspended_at ? '#EF4444' : '#1D9E75' }}
                >
                  {getInitials(u.full_name)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{u.full_name || '—'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <ActionMenu
                user={u}
                currentUserId={currentUserId}
                isSuperAdmin={isSuperAdmin}
                onRefresh={refreshUsers}
                onViewDetails={setSelectedUser}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ROLE_BADGE[u.role]}>
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
              {u.suspended_at && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Suspended</span>
              )}
              <span className="text-xs text-gray-400">Joined {fmtDate(u.created_at)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No users found</p>
        )}
      </div>

      {/* Slide-over */}
      <UserSlideOver
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
        onRefresh={refreshUsers}
      />
    </>
  )
}
