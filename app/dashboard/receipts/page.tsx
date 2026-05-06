'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import InvoiceRow from '@/components/InvoiceRow'

type PaidInvoice = Invoice & { payment_date: string | null }

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<PaidInvoice[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    async function fetchReceipts(userId: string) {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false, nullsFirst: false })
      if (active) {
        setReceipts((data as PaidInvoice[]) ?? [])
        setLoading(false)
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { if (active) setLoading(false); return }
      if (!active) return

      const userId = user.id

      const [, profileResult] = await Promise.all([
        fetchReceipts(userId),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ])
      if (active && profileResult.data) {
        setProfile(profileResult.data as Profile)
      }
      if (!active) return

      channel = supabase
        .channel(`receipts-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${userId}` },
          () => { if (active) fetchReceipts(userId) }
        )
        .subscribe()
    }

    init()

    return () => {
      active = false
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [])

  function handleStatusChange(id: string, status: InvoiceStatus) {
    // If a receipt is reverted to non-paid status, drop it from this list
    if (status !== 'paid') {
      setReceipts((prev) => prev.filter((r) => r.id !== id))
    } else {
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    }
  }

  function handleDelete(id: string) {
    setReceipts((prev) => prev.filter((r) => r.id !== id))
  }

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return receipts
    return receipts.filter(
      (r) =>
        r.client_name.toLowerCase().includes(q) ||
        r.inv_number.toLowerCase().includes(q) ||
        (r.service_name ?? '').toLowerCase().includes(q)
    )
  }, [receipts, search])

  // Metrics
  const currency = receipts[0]?.currency ?? 'NGN'
  const totalCollected = receipts.reduce((s, r) => s + r.total, 0)
  const thisMonthCollected = useMemo(() => {
    const now = new Date()
    const m = now.getMonth()
    const y = now.getFullYear()
    return receipts
      .filter((r) => {
        const d = r.payment_date ? new Date(r.payment_date) : new Date(r.updated_at)
        return d.getMonth() === m && d.getFullYear() === y
      })
      .reduce((s, r) => s + r.total, 0)
  }, [receipts])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-xs text-gray-400 mt-1">Paid invoices, ready to send to clients.</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && receipts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Receipts" value={String(receipts.length)} />
          <StatCard label="Collected" value={formatAmount(totalCollected, currency)} green />
          <StatCard label="This month" value={formatAmount(thisMonthCollected, currency)} />
        </div>
      )}

      {/* Search */}
      {!loading && receipts.length > 0 && (
        <div
          className="bg-white rounded-xl px-3 py-2 mb-3 flex items-center gap-2"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9e9e99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipts by client, number, or service…"
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-300 hover:text-gray-500 text-base leading-none px-1"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading receipts…</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2"/>
                <line x1="8" y1="8" x2="16" y2="8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No receipts yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Receipts appear here once you mark an invoice as paid.</p>
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              Go to invoices
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-400">No receipts match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div>
            {/* Desktop table header */}
            <div
              className="hidden md:flex items-center gap-3 px-4 py-2"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Client</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Paid</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Status</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Actions</div>
              <div className="w-16" />
            </div>
            {filtered.map((receipt) => (
              <InvoiceRow
                key={receipt.id}
                invoice={receipt}
                profile={profile}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div
      className="bg-white rounded-xl px-4 py-3"
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold truncate ${green ? 'text-brand' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
