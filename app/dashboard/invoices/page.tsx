'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import InvoiceRow from '@/components/InvoiceRow'

type FilterTab = 'all' | InvoiceStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    async function fetchInvoices(userId: string) {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (active) {
        setInvoices((data as Invoice[]) ?? [])
        setLoading(false)
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { if (active) setLoading(false); return }
      if (!active) return

      const userId = user.id

      // Fetch profile and invoices in parallel
      const [, profileResult] = await Promise.all([
        fetchInvoices(userId),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ])
      if (active && profileResult.data) {
        setProfile(profileResult.data as Profile)
      }
      if (!active) return

      channel = supabase
        .channel(`invoices-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${userId}` },
          () => { if (active) fetchInvoices(userId) }
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

  function handleDelete(id: string) {
    setInvoices((prev) => prev.filter((i) => i.id !== id))
  }

  function handleStatusChange(id: string, status: InvoiceStatus) {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
  }

  function countFor(tab: FilterTab) {
    if (tab === 'all') return invoices.length
    return invoices.filter((i) => i.status === tab).length
  }

  const filtered = activeTab === 'all' ? invoices : invoices.filter((i) => i.status === activeTab)

  const currency = invoices[0]?.currency ?? 'NGN'
  const outstanding = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0)
  const collected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.total, 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
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

      {/* Summary stats */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total" value={String(invoices.length)} />
          <StatCard label="Outstanding" value={formatAmount(outstanding, currency)} />
          <StatCard label="Collected" value={formatAmount(collected, currency)} green />
          <StatCard label="Overdue" value={String(overdueCount)} />
        </div>
      )}

      {/* Filter tabs */}
      <div
        className="bg-white rounded-xl p-1 flex gap-0.5 mb-3 overflow-x-auto"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {TABS.map((tab) => {
          const count = countFor(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Invoice list */}
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
            <p className="text-sm text-gray-400 mt-3">Loading invoices…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            {activeTab === 'all' ? (
              <>
                <p className="text-sm text-gray-500 font-medium">No invoices yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Create your first renewal invoice to get started.</p>
                <Link
                  href="/dashboard/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                >
                  Create first invoice
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-400">No {activeTab} invoices</p>
            )}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div
              className="hidden sm:flex items-center gap-3 px-4 py-2"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Client</div>
              <div className="hidden md:block w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Date</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Status</div>
              <div className="hidden md:block w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Actions</div>
              <div className="w-16" />
            </div>
            {filtered.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
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
