'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import { generatePDF, invoiceToPDFData } from '@/lib/generatePDF'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceRowProps {
  invoice: Invoice
  profile?: Profile | null
  readonly?: boolean
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: InvoiceStatus) => void
}

type ActionType = 'pdf' | 'whatsapp' | 'email'

// ─── Icons ───────────────────────────────────────────────────────────────────

function PdfIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function WAIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.392A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.073-1.119l-.292-.173-3.014.842.857-2.939-.19-.301A8 8 0 1112 20z"/>
    </svg>
  )
}

function EmailIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function SpinnerIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

function DotsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="19" cy="12" r="2"/>
    </svg>
  )
}

// ─── Action button configs ────────────────────────────────────────────────────

const ACTION_CONFIG = {
  pdf: {
    label: 'Download PDF',
    color: '#1a1a18',
    disabledColor: '#9e9e99',
    Icon: PdfIcon,
    title: 'Download invoice PDF',
  },
  whatsapp: {
    label: 'Send via WhatsApp',
    color: '#25D366',
    disabledColor: '#9e9e99',
    Icon: WAIcon,
    title: 'Send invoice via WhatsApp',
  },
  email: {
    label: 'Send via email',
    color: '#1D9E75',
    disabledColor: '#9e9e99',
    Icon: EmailIcon,
    title: 'Send invoice via email',
  },
} as const

// ─── Inline icon action button (desktop) ─────────────────────────────────────

function InlineActionBtn({
  type,
  loading,
  success,
  hasError,
  disabled,
  onClick,
}: {
  type: ActionType
  loading: boolean
  success: boolean
  hasError: boolean
  disabled: boolean
  onClick: () => void
}) {
  const cfg = ACTION_CONFIG[type]
  const isActive = loading || success || hasError

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={cfg.title}
      style={{ color: success ? '#1D9E75' : hasError ? '#ef4444' : cfg.color }}
      className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
    >
      {loading ? (
        <SpinnerIcon color={cfg.color} />
      ) : success ? (
        <CheckIcon />
      ) : (
        <cfg.Icon />
      )}
      {/* suppress unused var lint */}
      {isActive && null}
    </button>
  )
}

// ─── STATUS_OPTIONS ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: InvoiceStatus[] = ['pending', 'paid', 'overdue', 'cancelled']

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceRow({
  invoice,
  profile = null,
  readonly = false,
  onDelete,
  onStatusChange,
}: InvoiceRowProps) {
  const supabase = createClient()

  // Action state
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null)
  const [actionSuccess, setActionSuccess] = useState<ActionType | null>(null)
  const [actionError, setActionError] = useState<{ type: ActionType; message: string } | null>(null)

  // Mobile dots menu
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  function markSuccess(type: ActionType) {
    setActionSuccess(type)
    setTimeout(() => setActionSuccess(null), 1500)
  }

  function markError(type: ActionType, message: string) {
    setActionError({ type, message })
    setTimeout(() => setActionError(null), 4000)
  }

  const anyLoading = actionLoading !== null

  // ── PDF handler ─────────────────────────────────────────────────────────────

  async function handlePDF() {
    if (anyLoading) return
    setActionLoading('pdf')
    setActionError(null)
    setMenuOpen(false)
    try {
      const pdfData = invoiceToPDFData(invoice, profile)
      const doc = generatePDF(pdfData)
      const slug = (invoice.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')
      doc.save(`${invoice.inv_number}-${slug}.pdf`)
      markSuccess('pdf')
    } catch (err) {
      markError('pdf', err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setActionLoading(null)
    }
  }

  // ── WhatsApp handler ─────────────────────────────────────────────────────────

  async function handleWhatsApp() {
    if (anyLoading) return
    setActionLoading('whatsapp')
    setActionError(null)
    setMenuOpen(false)

    let pdfUrl = ''

    try {
      const pdfData = invoiceToPDFData(invoice, profile)
      const doc = generatePDF(pdfData)
      const blob = doc.output('blob')

      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (userId) {
        const fileName = `${userId}/${invoice.inv_number}.pdf`
        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName)
          pdfUrl = urlData?.publicUrl ?? ''
        }
      }
    } catch {
      // proceed without PDF URL — still open WhatsApp
    }

    const phone = (invoice.client_phone ?? '').replace(/\D/g, '')
    const currency = invoice.currency ?? 'NGN'
    const dueFmt = invoice.renewal_date
      ? new Date(invoice.renewal_date + 'T00:00:00').toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : ''
    const biz = profile?.business_name || 'us'
    const svc = invoice.service_name || 'your service'
    const plan = invoice.service_plan ? ` (${invoice.service_plan})` : ''

    const msg = [
      `Hello ${invoice.client_name || 'there'},`,
      ``,
      `This is a renewal reminder from *${biz}*.`,
      ``,
      `Your *${svc}${plan}* is due for renewal${dueFmt ? ` on *${dueFmt}*` : ''}.`,
      ``,
      `Invoice: ${invoice.inv_number}`,
      `Total: *${formatAmount(invoice.total, currency)}*`,
      ``,
      invoice.notes ? `${invoice.notes}\n` : '',
      `Please reach out to confirm or arrange payment. Thank you!`,
      ``,
      pdfUrl ? `📎 Invoice PDF: ${pdfUrl}` : '',
      ``,
      `— ${biz}`,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank')
    markSuccess('whatsapp')
    setActionLoading(null)
  }

  // ── Email handler ─────────────────────────────────────────────────────────────

  async function handleEmail() {
    if (anyLoading || !invoice.client_email) return
    setActionLoading('email')
    setActionError(null)
    setMenuOpen(false)

    try {
      const pdfData = invoiceToPDFData(invoice, profile)
      const doc = generatePDF(pdfData)
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceData: {
            invNumber: invoice.inv_number,
            clientName: invoice.client_name,
            bizName: profile?.business_name ?? '',
            bizEmail: profile?.business_email ?? '',
            serviceName: invoice.service_name ?? '',
            servicePlan: invoice.service_plan ?? '',
            renewalDate: invoice.renewal_date ?? '',
            currency: invoice.currency ?? 'NGN',
            taxRate: invoice.tax_rate,
            items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
            subtotal: invoice.subtotal,
            taxAmount: invoice.tax_amount,
            grand: invoice.total,
            bankName: profile?.bank_name ?? '',
            accountName: profile?.account_name ?? '',
            accountNumber: profile?.account_number ?? '',
            swiftCode: profile?.swift_code ?? '',
            iban: profile?.iban ?? '',
          },
          recipientEmail: invoice.client_email,
          pdfBase64,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        markError('email', json.error || 'Failed to send email')
      } else {
        markSuccess('email')
      }
    } catch (err) {
      markError('email', err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Status / delete handlers ──────────────────────────────────────────────────

  async function handleStatusChange(newStatus: InvoiceStatus) {
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', invoice.id)
    if (!error && onStatusChange) onStatusChange(invoice.id, newStatus)
  }

  async function handleDelete() {
    if (!confirm(`Delete invoice ${invoice.inv_number}? This cannot be undone.`)) return
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    if (!error && onDelete) onDelete(invoice.id)
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const renewalDate = invoice.renewal_date
    ? new Date(invoice.renewal_date + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

  const noEmail = !invoice.client_email

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        className="flex items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Client info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{invoice.client_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {[invoice.service_name, invoice.inv_number].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Renewal date — md+ only */}
        <div className="hidden md:block w-24 text-right flex-shrink-0">
          <p className="text-xs text-gray-500">{renewalDate}</p>
        </div>

        {/* Total */}
        <div className="w-20 sm:w-24 text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">
            {formatAmount(invoice.total, invoice.currency ?? 'NGN')}
          </p>
        </div>

        {/* Status */}
        <div className="w-20 sm:w-24 flex-shrink-0 flex justify-end">
          {readonly ? (
            <StatusBadge status={invoice.status} />
          ) : (
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
              className="text-xs rounded-lg border border-black/10 bg-surface px-2 py-1 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Action buttons — desktop (md+) ── */}
        {!readonly && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <InlineActionBtn
              type="pdf"
              loading={actionLoading === 'pdf'}
              success={actionSuccess === 'pdf'}
              hasError={actionError?.type === 'pdf'}
              disabled={anyLoading}
              onClick={handlePDF}
            />
            <InlineActionBtn
              type="whatsapp"
              loading={actionLoading === 'whatsapp'}
              success={actionSuccess === 'whatsapp'}
              hasError={actionError?.type === 'whatsapp'}
              disabled={anyLoading}
              onClick={handleWhatsApp}
            />
            <InlineActionBtn
              type="email"
              loading={actionLoading === 'email'}
              success={actionSuccess === 'email'}
              hasError={actionError?.type === 'email'}
              disabled={anyLoading || noEmail}
              onClick={handleEmail}
            />
          </div>
        )}

        {/* ── Action buttons — mobile (dots menu) ── */}
        {!readonly && (
          <div className="md:hidden relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={anyLoading}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40"
              title="Invoice actions"
            >
              {anyLoading ? (
                <SpinnerIcon
                  color={
                    ACTION_CONFIG[actionLoading as ActionType]?.color ?? '#9e9e99'
                  }
                />
              ) : (
                <DotsIcon />
              )}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl py-1 min-w-[180px]"
                style={{
                  border: '1px solid rgba(0,0,0,0.10)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}
              >
                {/* PDF */}
                <button
                  onClick={handlePDF}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                  style={{ color: ACTION_CONFIG.pdf.color }}
                >
                  {actionSuccess === 'pdf' ? <CheckIcon size={15} /> : <PdfIcon size={15} />}
                  <span className="font-medium text-gray-700">Download PDF</span>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                  style={{ color: ACTION_CONFIG.whatsapp.color }}
                >
                  {actionSuccess === 'whatsapp' ? <CheckIcon size={15} /> : <WAIcon size={15} />}
                  <span className="font-medium text-gray-700">Send via WhatsApp</span>
                </button>

                {/* Email */}
                <button
                  onClick={noEmail ? undefined : handleEmail}
                  disabled={noEmail}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: ACTION_CONFIG.email.color }}
                  title={noEmail ? 'No client email on file' : 'Send invoice via email'}
                >
                  {actionSuccess === 'email' ? <CheckIcon size={15} /> : <EmailIcon size={15} />}
                  <span className="font-medium text-gray-700">
                    {noEmail ? 'Email (no address)' : 'Send via email'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit */}
        {!readonly && (
          <Link
            href={`/dashboard/new?edit=${invoice.id}`}
            title="Edit invoice"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <EditIcon />
          </Link>
        )}

        {/* Delete */}
        {!readonly && (
          <button
            onClick={handleDelete}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete invoice"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        )}
      </div>

      {/* Error toast below row */}
      {actionError && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-red-700 bg-red-50"
          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="font-medium">
            {ACTION_CONFIG[actionError.type].label} failed:
          </span>{' '}
          {actionError.message}
        </div>
      )}
    </>
  )
}
