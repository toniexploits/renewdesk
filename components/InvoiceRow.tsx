'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceStatus, Profile } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import { generatePDF, invoiceToPDFData } from '@/lib/generatePDF'

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSE_MENUS_EVENT = 'renewdesk:close-menus'
const DRAFT_DISABLED_TITLE = 'Complete invoice before sending'

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

function EditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function DeleteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function DuplicateIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
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

const STATUS_DOT_COLORS: Record<InvoiceStatus, string> = {
  draft:     '#3b82f6',
  pending:   '#f59e0b',
  paid:      '#1D9E75',
  overdue:   '#ef4444',
  cancelled: '#9ca3af',
}

function StatusDot({ status }: { status: InvoiceStatus }) {
  return (
    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: STATUS_DOT_COLORS[status],
          display: 'inline-block',
        }}
      />
    </span>
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
    Icon: PdfIcon,
    title: 'Download invoice PDF',
  },
  whatsapp: {
    label: 'Send via WhatsApp',
    color: '#25D366',
    Icon: WAIcon,
    title: 'Send invoice via WhatsApp',
  },
  email: {
    label: 'Send via email',
    color: '#1D9E75',
    Icon: EmailIcon,
    title: 'Send invoice via email',
  },
} as const

// ─── Inline icon action button (desktop only) ─────────────────────────────────

function InlineActionBtn({
  type,
  loading,
  success,
  hasError,
  disabled,
  onClick,
  titleOverride,
}: {
  type: ActionType
  loading: boolean
  success: boolean
  hasError: boolean
  disabled: boolean
  onClick: () => void
  titleOverride?: string
}) {
  const cfg = ACTION_CONFIG[type]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={titleOverride ?? cfg.title}
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
    </button>
  )
}

// ─── Dropdown menu item ───────────────────────────────────────────────────────

function DropdownItem({
  icon,
  label,
  loading,
  success,
  onClick,
  disabled,
  iconColor,
}: {
  icon: React.ReactNode
  label: string
  loading?: boolean
  success?: boolean
  onClick?: () => void
  disabled?: boolean
  iconColor?: string
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ minHeight: 44, color: iconColor }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {loading
          ? <SpinnerIcon size={14} color={iconColor ?? '#1a1a18'} />
          : success
          ? <CheckIcon size={14} />
          : icon}
      </span>
      <span className="text-[14px] font-medium text-gray-700">{label}</span>
    </button>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function MenuDivider() {
  return <div style={{ height: 1, background: '#f0ede6', margin: '4px 0' }} />
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'pending', 'paid', 'overdue', 'cancelled']

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceRow({
  invoice,
  profile = null,
  readonly = false,
  onDelete,
  onStatusChange,
}: InvoiceRowProps) {
  const supabase = createClient()

  const [actionLoading, setActionLoading] = useState<ActionType | null>(null)
  const [actionSuccess, setActionSuccess] = useState<ActionType | null>(null)
  const [actionError, setActionError] = useState<{ type: ActionType; message: string } | null>(null)
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
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

  // Close when another row opens its menu
  useEffect(() => {
    function handleCloseMenus() { setMenuOpen(false) }
    document.addEventListener(CLOSE_MENUS_EVENT, handleCloseMenus)
    return () => document.removeEventListener(CLOSE_MENUS_EVENT, handleCloseMenus)
  }, [])

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false)
    } else {
      document.dispatchEvent(new CustomEvent(CLOSE_MENUS_EVENT))
      setMenuOpen(true)
    }
  }

  function showToast(message: string, ok = true) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function markSuccess(type: ActionType) {
    setActionSuccess(type)
    setTimeout(() => setActionSuccess(null), 1500)
  }

  function markError(type: ActionType, message: string) {
    setActionError({ type, message })
    setTimeout(() => setActionError(null), 4000)
  }

  const anyLoading = actionLoading !== null
  const anyBusy = anyLoading || duplicateLoading
  const isDraft = invoice.status === 'draft'

  // ── PDF handler ──────────────────────────────────────────────────────────────

  async function handlePDF() {
    if (anyBusy || isDraft) return
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
    if (anyBusy || isDraft) return
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

  // ── Email handler ────────────────────────────────────────────────────────────

  async function handleEmail() {
    if (anyBusy || isDraft || !invoice.client_email) return
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

  // ── Duplicate handler ────────────────────────────────────────────────────────

  async function handleDuplicate() {
    if (anyBusy) return
    setMenuOpen(false)
    setDuplicateLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) { showToast('Not signed in', false); return }

      const newInvNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`

      let newRenewalDate: string | null = null
      if (invoice.renewal_date) {
        const d = new Date(invoice.renewal_date + 'T00:00:00')
        d.setFullYear(d.getFullYear() + 1)
        newRenewalDate = d.toISOString().split('T')[0]
      }

      const { error } = await supabase.from('invoices').insert({
        user_id: userId,
        inv_number: newInvNumber,
        status: 'draft',
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_phone: invoice.client_phone,
        contact_name: invoice.contact_name,
        service_name: invoice.service_name,
        service_plan: invoice.service_plan,
        renewal_date: newRenewalDate,
        line_items: invoice.line_items,
        subtotal: invoice.subtotal,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        currency: invoice.currency,
        notes: invoice.notes,
      })

      if (error) {
        showToast(`Duplicate failed: ${error.message}`, false)
      } else {
        showToast(`Invoice duplicated as draft — ${newInvNumber}`)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Duplicate failed', false)
    } finally {
      setDuplicateLoading(false)
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

  const renewalDateShort = invoice.renewal_date
    ? new Date(invoice.renewal_date + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short',
      })
    : null

  const noEmail = !invoice.client_email

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dropdown-in {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ══ MOBILE LAYOUT (below md) ══════════════════════════════════════════ */}
      <div
        className={`md:hidden px-4 py-4 transition-colors ${
          isDraft
            ? 'border-l-[3px] border-blue-200 hover:bg-blue-50/40'
            : 'hover:bg-gray-50'
        }`}
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        onClick={() => {/* stub: future invoice detail view */}}
      >
        {/* Row 1: invoice number · amount · ⋯ button */}
        <div className="flex items-start justify-between">
          <span className={`text-[12px] font-medium mt-px tabular-nums ${isDraft ? 'text-blue-400' : 'text-gray-400'}`}>
            {invoice.inv_number}
          </span>

          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[15px] font-bold text-gray-900 tabular-nums">
              {formatAmount(invoice.total, invoice.currency ?? 'NGN')}
            </span>

            {!readonly && (
              <div className="relative" ref={menuRef}>
                {/* ⋯ trigger */}
                <button
                  onClick={toggleMenu}
                  disabled={anyBusy}
                  className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  title="Invoice actions"
                  aria-label="Invoice actions"
                >
                  {anyBusy
                    ? <SpinnerIcon color={
                        duplicateLoading ? '#3b82f6' :
                        ACTION_CONFIG[actionLoading as ActionType]?.color ?? '#9e9e99'
                      } />
                    : <DotsIcon />
                  }
                </button>

                {/* Dropdown panel */}
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-lg min-w-[200px] overflow-hidden"
                    style={{
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                      animation: 'dropdown-in 0.12s ease-out',
                    }}
                  >
                    {/* PDF */}
                    <DropdownItem
                      icon={<PdfIcon size={15} />}
                      label={isDraft ? 'Download PDF (draft)' : 'Download PDF'}
                      loading={actionLoading === 'pdf'}
                      success={actionSuccess === 'pdf'}
                      onClick={isDraft ? undefined : handlePDF}
                      disabled={anyBusy || isDraft}
                    />

                    {/* WhatsApp */}
                    <DropdownItem
                      icon={<WAIcon size={15} />}
                      label="Send via WhatsApp"
                      loading={actionLoading === 'whatsapp'}
                      success={actionSuccess === 'whatsapp'}
                      onClick={isDraft ? undefined : handleWhatsApp}
                      disabled={anyBusy || isDraft}
                      iconColor="#25D366"
                    />

                    {/* Email */}
                    <DropdownItem
                      icon={<EmailIcon size={15} />}
                      label={isDraft ? 'Send via email (draft)' : noEmail ? 'Email (no address)' : 'Send via email'}
                      loading={actionLoading === 'email'}
                      success={actionSuccess === 'email'}
                      onClick={(isDraft || noEmail) ? undefined : handleEmail}
                      disabled={anyBusy || isDraft || noEmail}
                      iconColor="#1D9E75"
                    />

                    <MenuDivider />

                    {/* Duplicate */}
                    <DropdownItem
                      icon={<DuplicateIcon size={15} />}
                      label="Duplicate"
                      loading={duplicateLoading}
                      onClick={handleDuplicate}
                      disabled={anyBusy}
                    />

                    {/* Edit */}
                    <Link
                      href={`/dashboard/new?edit=${invoice.id}`}
                      className="flex items-center gap-3 px-4 hover:bg-gray-50 transition-colors"
                      style={{ minHeight: 44 }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400">
                        <EditIcon size={15} />
                      </span>
                      <span className="text-[14px] font-medium text-gray-700">
                        {isDraft ? 'Complete invoice' : 'Edit invoice'}
                      </span>
                    </Link>

                    <MenuDivider />

                    {/* Status options — non-current statuses */}
                    {STATUS_OPTIONS.filter((s) => s !== invoice.status).map((s) => (
                      <button
                        key={s}
                        className="w-full flex items-center gap-3 px-4 text-left hover:bg-gray-50 transition-colors"
                        style={{ minHeight: 44 }}
                        onClick={() => { setMenuOpen(false); handleStatusChange(s) }}
                      >
                        <StatusDot status={s} />
                        <span className="text-[14px] font-medium text-gray-700">
                          Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                      </button>
                    ))}

                    <MenuDivider />

                    {/* Delete */}
                    <button
                      className="w-full flex items-center gap-3 px-4 text-left hover:bg-red-50 transition-colors"
                      style={{ minHeight: 44 }}
                      onClick={() => { setMenuOpen(false); handleDelete() }}
                    >
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-red-500">
                        <DeleteIcon size={15} />
                      </span>
                      <span className="text-[14px] font-medium text-red-600">Delete invoice</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: client name · status badge */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-[14px] font-bold text-gray-900 truncate leading-snug">
            {invoice.client_name}
          </p>
          <div className="flex-shrink-0">
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Row 3: service · due date */}
        {(invoice.service_name || renewalDateShort) && (
          <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">
            {[
              invoice.service_name,
              renewalDateShort ? `Due ${renewalDateShort}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {/* ══ DESKTOP LAYOUT (md+) ═════════════════════════════════════════════ */}
      <div
        className={`hidden md:flex items-center gap-3 px-4 py-3 transition-colors ${
          isDraft
            ? 'border-l-[3px] border-blue-200 hover:bg-blue-50/40'
            : 'hover:bg-gray-50'
        }`}
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Client info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{invoice.client_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {[invoice.service_name, invoice.inv_number].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Renewal date */}
        <div className="w-24 text-right flex-shrink-0">
          <p className="text-xs text-gray-500">{renewalDate}</p>
        </div>

        {/* Total */}
        <div className="w-24 text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">
            {formatAmount(invoice.total, invoice.currency ?? 'NGN')}
          </p>
        </div>

        {/* Status */}
        <div className="w-24 flex-shrink-0 flex justify-end">
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

        {/* Action buttons — disabled for drafts */}
        {!readonly && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <InlineActionBtn
              type="pdf"
              loading={actionLoading === 'pdf'}
              success={actionSuccess === 'pdf'}
              hasError={actionError?.type === 'pdf'}
              disabled={anyBusy || isDraft}
              onClick={handlePDF}
              titleOverride={isDraft ? DRAFT_DISABLED_TITLE : undefined}
            />
            <InlineActionBtn
              type="whatsapp"
              loading={actionLoading === 'whatsapp'}
              success={actionSuccess === 'whatsapp'}
              hasError={actionError?.type === 'whatsapp'}
              disabled={anyBusy || isDraft}
              onClick={handleWhatsApp}
              titleOverride={isDraft ? DRAFT_DISABLED_TITLE : undefined}
            />
            <InlineActionBtn
              type="email"
              loading={actionLoading === 'email'}
              success={actionSuccess === 'email'}
              hasError={actionError?.type === 'email'}
              disabled={anyBusy || isDraft || noEmail}
              onClick={handleEmail}
              titleOverride={isDraft ? DRAFT_DISABLED_TITLE : undefined}
            />
          </div>
        )}

        {/* Duplicate */}
        {!readonly && (
          <button
            onClick={handleDuplicate}
            disabled={anyBusy}
            title="Duplicate invoice as draft"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {duplicateLoading
              ? <SpinnerIcon size={14} color="#3b82f6" />
              : <DuplicateIcon />
            }
          </button>
        )}

        {/* Edit / Complete (for drafts, label changes to "Complete") */}
        {!readonly && (
          <Link
            href={`/dashboard/new?edit=${invoice.id}`}
            title={isDraft ? 'Complete draft invoice' : 'Edit invoice'}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              isDraft
                ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
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
            <DeleteIcon />
          </button>
        )}
      </div>

      {/* Error toast (shown below whichever layout is active) */}
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

      {/* Success / error toast — bottom-right, fixed */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-medium pointer-events-none ${
            toast.ok ? 'bg-brand' : 'bg-red-500'
          }`}
          style={{
            boxShadow: toast.ok
              ? '0 8px 24px rgba(29,158,117,0.35)'
              : '0 8px 24px rgba(239,68,68,0.35)',
            animation: 'toast-in 0.2s ease-out',
          }}
        >
          {toast.ok
            ? <CheckIcon size={15} />
            : <span style={{ fontSize: 15 }}>!</span>
          }
          {toast.message}
        </div>
      )}
    </>
  )
}
