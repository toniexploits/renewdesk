'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from './StatusBadge'
import DropdownPortal from './DropdownPortal'
import { generateQuotePDF, quoteToPDFData } from '@/lib/generateQuotePDF'
import { formatAmount } from '@/lib/format'
import type { Quote, QuoteStatus, Profile } from '@/lib/types'

const CLOSE_MENUS_EVENT = 'renewdesk:close-menus'

const STATUS_DOT_COLORS: Record<QuoteStatus | 'expired', string> = {
  draft:     '#3b82f6',
  sent:      '#5B21B6',
  approved:  '#1D9E75',
  converted: '#1D9E75',
  expired:   '#ef4444',
}

// Available next-statuses for each current status (excludes 'converted' — done via Convert flow)
const NEXT_STATUSES: Record<QuoteStatus, QuoteStatus[]> = {
  draft:     ['sent', 'approved'],
  sent:      ['draft', 'approved'],
  approved:  ['sent'],
  converted: [],
}

interface Props {
  quote: Quote
  profile?: Profile | null
  onDelete?:  (id: string) => void
  onUpdate?:  (id: string, updates: Partial<Quote>) => void
  readonly?:  boolean
}

export default function QuoteRow({ quote, profile, onDelete, onUpdate, readonly }: Props) {
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [confirmConvert,  setConfirmConvert]  = useState(false)
  const [actionLoading,   setActionLoading]   = useState(false)
  const [convertLoading,  setConvertLoading]  = useState(false)
  const [toast,           setToast]           = useState<{ msg: string; invoiceId?: string } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Client-side expired check
  const isExpired =
    quote.valid_until != null &&
    new Date() > new Date(quote.valid_until + 'T23:59:59') &&
    quote.status !== 'converted'

  const displayStatus: QuoteStatus | 'expired' = isExpired ? 'expired' : quote.status

  const validUntilFmt = quote.valid_until
    ? new Date(quote.valid_until + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

  const createdFmt = new Date(quote.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  useEffect(() => {
    function onCloseMenus() { setMenuOpen(false) }
    document.addEventListener(CLOSE_MENUS_EVENT, onCloseMenus)
    return () => document.removeEventListener(CLOSE_MENUS_EVENT, onCloseMenus)
  }, [])

  function showToast(msg: string, invoiceId?: string) {
    setToast({ msg, invoiceId })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleMenu() {
    if (menuOpen) { setMenuOpen(false); return }
    document.dispatchEvent(new CustomEvent(CLOSE_MENUS_EVENT))
    setMenuOpen(true)
  }

  async function handleStatusChange(newStatus: QuoteStatus) {
    setMenuOpen(false)
    setActionLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quote.id)
    setActionLoading(false)
    if (!error) {
      onUpdate?.(quote.id, { status: newStatus })
      showToast(`Marked as ${newStatus}`)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('quotes').delete().eq('id', quote.id)
    setActionLoading(false)
    onDelete?.(quote.id)
  }

  async function handleConvert() {
    setConvertLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setConvertLoading(false); return }

    const invNumber   = `INV-${Date.now().toString().slice(-6)}`
    const renewalDate = new Date()
    renewalDate.setFullYear(renewalDate.getFullYear() + 1)
    const renewalDateStr = renewalDate.toISOString().split('T')[0]

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        user_id:      user.id,
        inv_number:   invNumber,
        client_name:  quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        contact_name: quote.contact_name,
        service_name: quote.service_name,
        service_plan: quote.service_plan,
        renewal_date: renewalDateStr,
        line_items:   quote.line_items,
        subtotal:     quote.subtotal,
        tax_rate:     quote.tax_rate,
        tax_amount:   quote.tax_amount,
        total:        quote.total,
        currency:     quote.currency,
        notes:        quote.notes,
        status:       'pending' as const,
      })
      .select('id')
      .single()

    if (invError || !invoice) {
      setConvertLoading(false)
      showToast('Failed to create invoice.')
      return
    }

    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        status:               'converted' as const,
        converted_invoice_id: invoice.id,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', quote.id)

    setConvertLoading(false)
    setConfirmConvert(false)

    if (!quoteError) {
      onUpdate?.(quote.id, { status: 'converted', converted_invoice_id: invoice.id })
      showToast('Invoice created', invoice.id)
    }
  }

  async function handleRenewQuote() {
    setMenuOpen(false)
    setActionLoading(true)
    const d = new Date()
    d.setDate(d.getDate() + quote.validity_days)
    const newValidUntil = d.toISOString().split('T')[0]
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({ valid_until: newValidUntil, updated_at: new Date().toISOString() })
      .eq('id', quote.id)
    setActionLoading(false)
    if (!error) {
      onUpdate?.(quote.id, { valid_until: newValidUntil })
      showToast(`Quote validity extended to ${new Date(newValidUntil + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`)
    }
  }

  function handleDownloadPdf() {
    setMenuOpen(false)
    const pdfData = quoteToPDFData(quote, profile ?? null)
    const doc     = generateQuotePDF(pdfData)
    const slug    = quote.client_name.replace(/[^a-zA-Z0-9]/g, '_') || 'Client'
    doc.save(`${quote.quote_number}-${slug}.pdf`)
  }

  async function handleWhatsApp() {
    setMenuOpen(false)
    const phone = (quote.client_phone ?? '').replace(/\D/g, '')
    const biz   = profile?.business_name || 'us'
    const svc   = quote.service_name || 'your service'
    const plan  = quote.service_plan ? ` (${quote.service_plan})` : ''

    let pdfUrl = ''
    try {
      const doc = generateQuotePDF(quoteToPDFData(quote, profile ?? null))
      const pdfBlob = doc.output('blob')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
        const fileName = `${userId}/${quote.quote_number}.pdf`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName)
          pdfUrl = urlData?.publicUrl ?? ''
        }
      }
    } catch { /* silent */ }

    const msgParts = [
      `Hello ${quote.client_name || 'there'},`,
      ``,
      `${biz} has prepared a quote for *${svc}${plan}*.`,
      ``,
      `Quote total: *${formatAmount(quote.total, quote.currency ?? 'NGN')}*`,
      ``,
      quote.valid_until ? `This quote is valid until *${validUntilFmt}*.` : `This quote is valid for *${quote.validity_days} days*.`,
      ``,
      quote.notes ? `${quote.notes}\n` : '',
      `Please approve or reach out to discuss. Thank you!`,
      ``,
      pdfUrl ? `📎 Quote PDF: ${pdfUrl}` : '',
      ``,
      `— ${biz}`,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(msgParts)}`, '_blank')
  }

  async function handleSendEmail() {
    setMenuOpen(false)
    if (!quote.client_email) return
    try {
      const doc     = generateQuotePDF(quoteToPDFData(quote, profile ?? null))
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          invoiceData: {
            invNumber:   quote.quote_number,
            clientName:  quote.client_name,
            bizName:     profile?.business_name ?? '',
            bizEmail:    profile?.business_email ?? '',
            serviceName: quote.service_name,
            servicePlan: quote.service_plan,
            validUntil:  quote.valid_until ?? undefined,
            currency:    quote.currency ?? 'NGN',
            taxRate:     quote.tax_rate,
            items:       Array.isArray(quote.line_items)
              ? (quote.line_items as { desc?: string; qty?: number; price?: number }[]).map((i) => ({
                  desc: i.desc || 'Item', qty: i.qty || 1, price: i.price || 0,
                }))
              : [],
            subtotal:  quote.subtotal,
            taxAmount: quote.tax_amount,
            grand:     quote.total,
          },
          recipientEmail: quote.client_email,
          pdfBase64,
        }),
      })
      if (res.ok) {
        // Auto-mark as sent if it was draft
        if (quote.status === 'draft') {
          const supabase = createClient()
          await supabase
            .from('quotes')
            .update({ status: 'sent', updated_at: new Date().toISOString() })
            .eq('id', quote.id)
          onUpdate?.(quote.id, { status: 'sent' })
        }
        showToast(`Quote sent to ${quote.client_email}`)
      } else {
        showToast('Failed to send email')
      }
    } catch {
      showToast('Failed to send email')
    }
  }

  // ── Dropdown menu content ──────────────────────────────────────────────────

  const isConverted = quote.status === 'converted'
  const nextStatuses = NEXT_STATUSES[quote.status]

  const dropdownContent = (
    <div
      className="bg-white rounded-xl py-1.5 text-sm"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)', minWidth: 200 }}
    >
      {!isConverted && (
        <>
          {/* PDF / WhatsApp / Email */}
          <button onClick={handleDownloadPdf} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
          <button onClick={handleWhatsApp} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#1eba58] hover:bg-gray-50 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.392A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.073-1.119l-.292-.173-3.014.842.857-2.939-.19-.301A8 8 0 1112 20z"/>
            </svg>
            Send via WhatsApp
          </button>
          {quote.client_email && (
            <button onClick={handleSendEmail} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
              Send via email
            </button>
          )}

          <div className="my-1.5 mx-3" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

          {/* Convert to Invoice */}
          <button
            onClick={() => { setMenuOpen(false); setConfirmConvert(true) }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#1D9E75] hover:bg-gray-50 transition-colors font-medium"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <polyline points="16 13 12 17 8 13"/>
              <line x1="12" y1="17" x2="12" y2="9"/>
            </svg>
            Convert to invoice
          </button>

          {/* Edit */}
          <Link
            href={`/dashboard/quotes/new?edit=${quote.id}`}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit quote
          </Link>

          {/* Mark as... */}
          {(nextStatuses.length > 0 || isExpired) && (
            <div className="my-1.5 mx-3" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />
          )}
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT_COLORS[s], display: 'inline-block', flexShrink: 0 }} />
              Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {isExpired && (
            <button
              onClick={handleRenewQuote}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.33"/>
              </svg>
              Renew quote
            </button>
          )}

          <div className="my-1.5 mx-3" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />
        </>
      )}

      {/* View converted invoice */}
      {isConverted && quote.converted_invoice_id && (
        <>
          <Link
            href={`/dashboard/invoices`}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[#1D9E75] hover:bg-gray-50 transition-colors font-medium"
            onClick={() => setMenuOpen(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            View invoice →
          </Link>
          <div className="my-1.5 mx-3" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />
        </>
      )}

      {/* Delete */}
      <button
        onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-red-500 hover:bg-red-50 transition-colors"
        disabled={actionLoading}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        Delete quote
      </button>
    </div>
  )

  // ── Row ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Desktop row ─────────────────────────────────────────── */}
      <div
        className="hidden md:flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      >
        {/* Client info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{quote.client_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{quote.quote_number}</p>
        </div>

        {/* Valid until */}
        <div className="w-24 text-right">
          <p className="text-xs text-gray-600">{validUntilFmt}</p>
        </div>

        {/* Total */}
        <div className="w-24 text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatAmount(quote.total, quote.currency ?? 'NGN')}
          </p>
        </div>

        {/* Status */}
        <div className="w-24 flex justify-end">
          <StatusBadge status={displayStatus} />
        </div>

        {/* Actions */}
        <div className="w-24 flex justify-end relative">
          {!readonly && (
            <button
              ref={triggerRef}
              onClick={toggleMenu}
              disabled={actionLoading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
              aria-label="Quote actions"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5"  r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="12" cy="19" r="1.5"/>
                </svg>
              )}
            </button>
          )}
          <DropdownPortal isOpen={menuOpen} anchorRef={triggerRef} onClose={() => setMenuOpen(false)}>
            {dropdownContent}
          </DropdownPortal>
        </div>

        {/* Extra spacer to align with invoices header */}
        <div className="w-16" />
      </div>

      {/* ── Mobile card ─────────────────────────────────────────── */}
      <div
        className="md:hidden px-4 py-3"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      >
        {/* Row 1: quote number / amount / ⋯ */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-400 flex-shrink-0">{quote.quote_number}</span>
          <span className="flex-1" />
          <span className="text-sm font-semibold text-gray-900">
            {formatAmount(quote.total, quote.currency ?? 'NGN')}
          </span>
          {!readonly && (
            <button
              ref={triggerRef}
              onClick={toggleMenu}
              disabled={actionLoading}
              className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors ml-1 disabled:opacity-40"
              aria-label="Quote actions"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5"  cy="12" r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="19" cy="12" r="1.5"/>
                </svg>
              )}
            </button>
          )}
          <DropdownPortal isOpen={menuOpen} anchorRef={triggerRef} onClose={() => setMenuOpen(false)}>
            {dropdownContent}
          </DropdownPortal>
        </div>

        {/* Row 2: client / status badge */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 flex-1 truncate">{quote.client_name}</span>
          <StatusBadge status={displayStatus} />
        </div>

        {/* Row 3: service / valid until */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-1 truncate">
            {quote.service_name || '—'}
            {quote.service_plan ? ` · ${quote.service_plan}` : ''}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            Valid {validUntilFmt}
          </span>
        </div>
      </div>

      {/* ── Delete confirmation ───────────────────────────────────── */}
      {confirmDelete && (
        <div className="px-4 py-3 bg-red-50" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <p className="text-sm font-medium text-red-700 mb-2">Delete this quote?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 px-3 py-2 text-sm text-gray-600 bg-white border border-black/[0.12] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex-1 px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
            >
              {actionLoading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* ── Convert confirmation ─────────────────────────────────── */}
      {confirmConvert && (
        <div className="px-4 py-3 bg-[#E1F5EE]" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <p className="text-sm font-medium text-[#085041] mb-0.5">Convert to invoice?</p>
          <p className="text-xs text-[#085041]/70 mb-2">
            Creates a pending invoice with renewal date 1 year from today.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmConvert(false)}
              className="flex-1 px-3 py-2 text-sm text-gray-600 bg-white border border-black/[0.12] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={convertLoading}
              className="flex-1 px-3 py-2 text-sm text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors disabled:opacity-60"
            >
              {convertLoading ? 'Converting…' : 'Convert'}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
          style={{ background: '#1a1a18', maxWidth: 340 }}
        >
          <span className="truncate">{toast.msg}</span>
          {toast.invoiceId && (
            <Link
              href="/dashboard/invoices"
              className="flex-shrink-0 text-brand hover:text-green-300 font-semibold transition-colors"
            >
              View →
            </Link>
          )}
        </div>
      )}
    </>
  )
}
