'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client, Invoice, InvoiceStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import InvoiceRow from '@/components/InvoiceRow'
import { useTeam } from '@/contexts/TeamContext'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { effectiveUserId } = useTeam()

  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!effectiveUserId || !id) return
    const uid = effectiveUserId
    const supabase = createClient()
    let active = true

    async function load() {
      const [clientRes, profileRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).eq('user_id', uid).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', uid).single(),
      ])

      if (!active) return

      if (!clientRes.data) { setNotFound(true); setLoading(false); return }
      setClient(clientRes.data as Client)
      if (profileRes.data) setProfile(profileRes.data as Profile)

      // Fetch invoices by client name
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', uid)
        .eq('client_name', clientRes.data.name)
        .order('created_at', { ascending: false })

      if (active) {
        setInvoices((invData as Invoice[]) ?? [])
        setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [effectiveUserId, id])

  function handleDelete(invId: string) {
    setInvoices(prev => prev.filter(i => i.id !== invId))
  }

  function handleStatusChange(invId: string, status: InvoiceStatus) {
    setInvoices(prev => prev.map(i => i.id === invId ? { ...i, status } : i))
  }

  function handleUpdate(invId: string, updates: Partial<Invoice>) {
    setInvoices(prev => prev.map(i => i.id === invId ? { ...i, ...updates } : i))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">Client not found.</p>
        <Link href="/dashboard/clients" className="text-sm text-brand font-medium hover:underline">← Back to Clients</Link>
      </div>
    )
  }

  const currency = profile?.currency ?? 'NGN'
  const activeInvoices = invoices.filter(i => i.status !== 'draft')
  const total = activeInvoices.filter(i => (i.currency ?? 'NGN') === currency).reduce((s, i) => s + i.total, 0)
  const collected = activeInvoices.filter(i => i.status === 'paid' && (i.currency ?? 'NGN') === currency).reduce((s, i) => s + i.total, 0)
  const outstanding = activeInvoices
    .filter(i => (i.status === 'pending' || i.status === 'overdue' || i.status === 'partial') && (i.currency ?? 'NGN') === currency)
    .reduce((s, i) => s + (i.status === 'partial' ? i.total - (i.amount_paid ?? 0) : i.total), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Clients
      </Link>

      {/* Client card */}
      <div
        className="bg-white rounded-2xl p-6 mb-6"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client?.name}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
              {client?.email && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {client.email}
                </span>
              )}
              {client?.phone && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/>
                  </svg>
                  {client.phone}
                </span>
              )}
              {client?.contact_name && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {client.contact_name}
                </span>
              )}
              {client?.address && (
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {client.address}
                </span>
              )}
            </div>
            {client?.notes && (
              <p className="mt-3 text-sm text-gray-400 italic">{client.notes}</p>
            )}
          </div>
          <Link
            href="/dashboard/new"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New invoice
          </Link>
        </div>

        {/* Stats */}
        {activeInvoices.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Total invoiced</p>
              <p className="text-base font-bold text-gray-900">{formatAmount(total, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Collected</p>
              <p className="text-base font-bold text-brand">{formatAmount(collected, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Outstanding</p>
              <p className="text-base font-bold text-amber-600">{formatAmount(outstanding, currency)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Invoice history */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Invoice history
          {invoices.length > 0 && <span className="ml-2 text-gray-400 font-normal">({invoices.length})</span>}
        </h2>
      </div>

      {invoices.length === 0 ? (
        <div
          className="bg-white rounded-xl py-12 text-center"
          style={{ border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <p className="text-sm text-gray-400">No invoices found for {client?.name}.</p>
          <p className="text-xs text-gray-400 mt-1">Invoices are matched by client name.</p>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          {invoices.map((inv, i) => (
            <div key={inv.id} style={i > 0 ? { borderTop: '1px solid rgba(0,0,0,0.05)' } : {}}>
              <InvoiceRow
                invoice={inv}
                profile={profile}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onUpdate={handleUpdate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
