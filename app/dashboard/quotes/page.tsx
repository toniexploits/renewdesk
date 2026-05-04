'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Quote, QuoteStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import QuoteRow from '@/components/QuoteRow'

type FilterTab = 'all' | QuoteStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'draft',     label: 'Draft'     },
  { key: 'sent',      label: 'Sent'      },
  { key: 'approved',  label: 'Approved'  },
  { key: 'converted', label: 'Converted' },
]

export default function QuotesPage() {
  const [quotes,    setQuotes]    = useState<Quote[]>([])
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    let active  = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function fetchQuotes(userId: string) {
      const { data } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (active) {
        setQuotes((data as Quote[]) ?? [])
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
        fetchQuotes(userId),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ])
      if (active && profileResult.data) setProfile(profileResult.data as Profile)
      if (!active) return

      channel = supabase
        .channel(`quotes-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'quotes', filter: `user_id=eq.${userId}` },
          () => { if (active) fetchQuotes(userId) }
        )
        .subscribe()
    }

    init()
    return () => {
      active = false
      if (channel) { supabase.removeChannel(channel); channel = null }
    }
  }, [])

  function handleDelete(id: string) {
    setQuotes((prev) => prev.filter((q) => q.id !== id))
  }

  function handleUpdate(id: string, updates: Partial<Quote>) {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  function countFor(tab: FilterTab) {
    if (tab === 'all') return quotes.length
    return quotes.filter((q) => q.status === tab).length
  }

  const filtered = activeTab === 'all' ? quotes : quotes.filter((q) => q.status === activeTab)

  const currency = quotes[0]?.currency ?? 'NGN'

  // Stats
  const now           = new Date()
  const active_quotes = quotes.filter((q) => q.status === 'sent' || q.status === 'approved')
  const pipeline      = active_quotes.reduce((s, q) => s + q.total, 0)
  const converted     = quotes.filter((q) => q.status === 'converted').length
  const expired       = quotes.filter(
    (q) => q.valid_until && new Date(q.valid_until + 'T23:59:59') < now && q.status !== 'converted'
  ).length
  const draftsCount   = quotes.filter((q) => q.status === 'draft').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quotes</h1>
        <Link
          href="/dashboard/quotes/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New quote
        </Link>
      </div>

      {/* Summary stats */}
      {!loading && quotes.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total"     value={String(quotes.length)} />
            <StatCard label="Pipeline"  value={formatAmount(pipeline, currency)} />
            <StatCard label="Converted" value={String(converted)} green />
            <StatCard label="Expired"   value={String(expired)} />
          </div>

          {draftsCount > 0 && activeTab !== 'draft' && (
            <button
              onClick={() => setActiveTab('draft')}
              className="w-full flex items-center gap-2 px-4 py-2.5 mb-3 rounded-xl text-sm transition-colors text-left"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
              <span className="font-medium text-blue-700">
                {draftsCount} draft {draftsCount === 1 ? 'quote' : 'quotes'} — send before they expire
              </span>
              <span className="ml-auto text-blue-400 text-xs font-medium">View drafts →</span>
            </button>
          )}
        </>
      )}

      {/* Filter tabs */}
      <div
        className="bg-white rounded-xl p-1 flex gap-0.5 mb-3 overflow-x-auto"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
      >
        {TABS.map((tab) => {
          const count    = countFor(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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

      {/* Quote list */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
      >
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading quotes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            {activeTab === 'all' ? (
              <>
                <p className="text-sm text-gray-500 font-medium">No quotes yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Create your first quote and send it for approval.</p>
                <Link
                  href="/dashboard/quotes/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                >
                  Create first quote
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-400">No {activeTab} quotes</p>
            )}
          </div>
        ) : (
          <div>
            {/* Table header — desktop only */}
            <div
              className="hidden md:flex items-center gap-3 px-4 py-2"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Client</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Valid until</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Status</div>
              <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400">Actions</div>
              <div className="w-16" />
            </div>
            {filtered.map((quote) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                profile={profile}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
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
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold truncate ${green ? 'text-brand' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
