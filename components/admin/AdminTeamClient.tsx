'use client'

import { useState } from 'react'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  business_name: string | null
  role: string
  created_at: string
}

const ROLE_BADGE: Record<string, React.CSSProperties> = {
  admin:       { background: '#EFF6FF', color: '#1D4ED8' },
  super_admin: { background: '#E1F5EE', color: '#085041' },
}
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', super_admin: 'Super Admin',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminTeamClient({
  team: initialTeam,
  isSuperAdmin,
  currentUserId,
}: {
  team: TeamMember[]
  isSuperAdmin: boolean
  currentUserId: string
}) {
  const [team, setTeam]       = useState(initialTeam)
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function grantAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Error granting admin'); return }
    setSuccess(`Admin access granted to ${email}`)
    setEmail('')
    refreshTeam()
  }

  async function revokeAdmin(userId: string, name: string) {
    if (!confirm(`Remove admin access for ${name}?`)) return
    await fetch('/api/admin/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    refreshTeam()
  }

  async function refreshTeam() {
    const res = await fetch('/api/admin/team')
    if (res.ok) setTeam(await res.json())
  }

  return (
    <div className="space-y-6">
      {/* Grant admin form — super_admin only */}
      {isSuperAdmin && (
        <div
          className="bg-white rounded-xl px-5 py-5"
          style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Grant Admin Access</h2>
          <form onSubmit={grantAdmin} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="flex-1 px-3 py-2 text-sm border border-black/10 rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
            >
              {loading ? 'Granting…' : 'Grant admin'}
            </button>
          </form>
          {error   && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-[#1D9E75] font-medium">{success}</p>}
        </div>
      )}

      {/* Current admin team */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-semibold text-gray-900">Current Admin Team ({team.length})</h2>
        </div>
        <div className="divide-y divide-black/[0.04]">
          {team.map(member => (
            <div key={member.id} className="flex items-center gap-4 px-5 py-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: '#1D9E75' }}
              >
                {getInitials(member.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800 text-sm">{member.full_name || '—'}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ROLE_BADGE[member.role]}>
                    {ROLE_LABEL[member.role] ?? member.role}
                  </span>
                  {member.id === currentUserId && (
                    <span className="text-[10px] text-gray-400">(you)</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.email}</p>
                <p className="text-xs text-gray-400">Granted {fmtDate(member.created_at)}</p>
              </div>
              {isSuperAdmin && member.id !== currentUserId && member.role !== 'super_admin' && (
                <button
                  onClick={() => revokeAdmin(member.id, member.full_name || member.email)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          {team.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No admins yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
