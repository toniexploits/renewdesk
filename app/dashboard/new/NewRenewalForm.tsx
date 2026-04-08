'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatAmount, CURRENCY_OPTIONS } from '@/lib/format'
import type { Profile, LineItem } from '@/lib/types'

// ─── Icon sub-components ────────────────────────────────────────────────────

function ChevRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function ChevLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function PlusSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.392A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.073-1.119l-.292-.173-3.014.842.857-2.939-.19-.301A8 8 0 1112 20z"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.33"/>
    </svg>
  )
}

// ─── Styling constants ───────────────────────────────────────────────────────

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg bg-surface border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300 text-base text-gray-900'

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{children}</p>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 mb-3 ${className}`}
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Client & Service', sub: 'Details & schedule' },
    { n: 2, label: 'Invoice', sub: 'Items & pricing' },
    { n: 3, label: 'Preview & Send', sub: 'Calendar + WhatsApp' },
  ]

  return (
    <div
      className="flex items-center bg-white rounded-xl px-3 py-3 mb-3"
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {steps.map((s, idx) => {
        const done = s.n < step
        const active = s.n === step
        return (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all ${
                  done || active
                    ? 'bg-brand text-white'
                    : 'bg-surface text-gray-400'
                }`}
                style={{ border: done || active ? '1.5px solid #1D9E75' : '1.5px solid rgba(0,0,0,0.13)' }}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className={`text-[11px] font-medium truncate ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.label}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{s.sub}</p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="w-3 h-px bg-black/10 flex-shrink-0 mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Invoice preview sub-component ──────────────────────────────────────────

interface PreviewProps {
  form: FormData
  items: LineItem[]
  invNumber: string
  subtotal: number
  taxAmount: number
  grand: number
}

function InvoicePreview({ form, items, invNumber, subtotal, taxAmount, grand }: PreviewProps) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const dueDate = form.renewalDate
    ? new Date(form.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Upon renewal'

  const currency = form.currency

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}>
      <div className="p-4">
        {/* Top: Invoice heading + meta */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-brand" style={{ fontFamily: 'Georgia, serif' }}>Invoice</h2>
            <p className="text-xs text-gray-400 mt-1">
              {form.serviceName || 'Service'}
              {form.servicePlan ? ` — ${form.servicePlan}` : ''}
            </p>
          </div>
          <div className="text-xs text-gray-400 leading-7 sm:text-right">
            <p className="text-sm font-semibold text-gray-900">{form.bizName || 'Your Business'}</p>
            <p>{form.bizEmail}</p>
            <p className="mt-1">{invNumber}</p>
            <p>Issued: {today}</p>
            <p>Due: {dueDate}</p>
            <div className="mt-1">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Draft</span>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div
          className="grid grid-cols-2 gap-3 mb-4 pb-3"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">From</p>
            <p className="text-xs text-gray-700 leading-6">
              {form.bizName || 'Your Business'}<br />
              {form.bizEmail}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill to</p>
            <p className="text-xs text-gray-700 leading-6">
              {form.clientName || 'Client'}
              {form.contactName && <><br />{form.contactName}</>}
              {form.clientEmail && <><br />{form.clientEmail}</>}
            </p>
          </div>
        </div>

        {/* Line items table */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs" style={{ minWidth: '260px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th className="text-left py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</th>
                <th className="text-center py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Qty</th>
                <th className="text-right py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Unit price</th>
                <th className="text-right py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td className="py-2 text-gray-800">{item.desc || 'Item'}</td>
                  <td className="py-2 text-center text-gray-700">{item.qty}</td>
                  <td className="py-2 text-right text-gray-700">{formatAmount(item.price, currency)}</td>
                  <td className="py-2 text-right text-gray-800 font-medium">{formatAmount(item.qty * item.price, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500 py-0.5">
            <span>Subtotal</span>
            <span>{formatAmount(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-0.5">
            <span>Tax ({form.taxRate}%)</span>
            <span>{formatAmount(taxAmount, currency)}</span>
          </div>
          <div
            className="flex justify-between text-sm font-semibold text-gray-900 py-2 mt-1"
            style={{ borderTop: '1.5px solid rgba(0,0,0,0.13)' }}
          >
            <span>Total due</span>
            <span>{formatAmount(grand, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FormData interface ──────────────────────────────────────────────────────

interface FormData {
  clientName: string
  contactName: string
  clientEmail: string
  clientPhone: string
  serviceName: string
  servicePlan: string
  renewalDate: string
  reminderDays: number
  clientNotes: string
  bizName: string
  bizEmail: string
  currency: string
  taxRate: number
}

// ─── PDF generation ──────────────────────────────────────────────────────────

function generatePdfHtml(
  form: FormData,
  items: LineItem[],
  invNumber: string,
  subtotal: number,
  taxAmount: number,
  grand: number
): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const dueDate = form.renewalDate
    ? new Date(form.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Upon renewal'

  const currency = form.currency

  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.desc || 'Item')}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${formatAmount(i.price, currency)}</td><td style="text-align:right">${formatAmount(i.qty * i.price, currency)}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${invNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',Arial,sans-serif;background:#fff;color:#1a1a18;padding:40px;}
  @media print{body{padding:20px;} @page{margin:20mm;}}
  h1{font-size:28px;color:#1D9E75;font-family:Georgia,serif;font-weight:700;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
  .meta{font-size:12px;color:#6b6b67;line-height:1.8;text-align:right;}
  .meta-biz{font-size:13px;font-weight:600;color:#1a1a18;}
  .svc{font-size:12px;color:#6b6b67;margin-top:4px;}
  .parties{display:flex;gap:24px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(0,0,0,0.10);}
  .party-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9e9e99;margin-bottom:4px;}
  .party-val{font-size:12px;color:#1a1a18;line-height:1.7;}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9e9e99;text-align:left;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.10);}
  td{padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.07);color:#1a1a18;}
  .tot{display:flex;justify-content:space-between;font-size:12px;color:#6b6b67;padding:2px 0;}
  .grand{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#1a1a18;border-top:1.5px solid rgba(0,0,0,0.13);padding-top:8px;margin-top:4px;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#FAEEDA;color:#633806;}
</style>
</head>
<body>
<div class="top">
  <div>
    <h1>Invoice</h1>
    <div class="svc">${esc(form.serviceName || 'Service')}${form.servicePlan ? ' &mdash; ' + esc(form.servicePlan) : ''}</div>
  </div>
  <div class="meta">
    <div class="meta-biz">${esc(form.bizName || 'Your Business')}</div>
    <div>${esc(form.bizEmail)}</div>
    <div style="margin-top:8px">${esc(invNumber)}</div>
    <div>Issued: ${today}</div>
    <div>Due: ${dueDate}</div>
    <div style="margin-top:8px"><span class="badge">Pending payment</span></div>
  </div>
</div>
<div class="parties">
  <div>
    <div class="party-label">From</div>
    <div class="party-val">${esc(form.bizName || 'Your Business')}<br>${esc(form.bizEmail)}</div>
  </div>
  <div>
    <div class="party-label">Bill to</div>
    <div class="party-val">${esc(form.clientName || 'Client')}${form.contactName ? '<br>' + esc(form.contactName) : ''}${form.clientEmail ? '<br>' + esc(form.clientEmail) : ''}</div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit price</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="tot"><span>Subtotal</span><span>${formatAmount(subtotal, currency)}</span></div>
<div class="tot"><span>Tax (${form.taxRate}%)</span><span>${formatAmount(taxAmount, currency)}</span></div>
<div class="grand"><span>Total due</span><span>${formatAmount(grand, currency)}</span></div>
</body>
</html>`
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  profile: Profile | null
}

export default function NewRenewalForm({ profile }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)
  const [invNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`)

  const [form, setForm] = useState<FormData>({
    clientName: '',
    contactName: '',
    clientEmail: '',
    clientPhone: '',
    serviceName: '',
    servicePlan: '',
    renewalDate: '',
    reminderDays: 7,
    clientNotes: '',
    bizName: profile?.business_name ?? '',
    bizEmail: profile?.business_email ?? '',
    currency: profile?.currency ?? 'NGN',
    taxRate: profile?.tax_rate ?? 7.5,
  })

  const [items, setItems] = useState<LineItem[]>([])

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Computed totals
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items])
  const taxAmount = useMemo(() => (subtotal * form.taxRate) / 100, [subtotal, form.taxRate])
  const grand = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  function addItem(desc = '', qty = 1, price = 0) {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev, { id, desc, qty, price }])
  }

  function updateItem(id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function goStep2() {
    if (items.length === 0) {
      addItem(form.serviceName || 'Service renewal', 1, 0)
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function goStep3() {
    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setSaveError('Not authenticated. Please refresh and try again.'); return }

      const payload = {
        user_id: user.id,
        inv_number: invNumber,
        client_name: form.clientName || 'Client',
        client_email: form.clientEmail || null,
        client_phone: form.clientPhone || null,
        contact_name: form.contactName || null,
        service_name: form.serviceName || null,
        service_plan: form.servicePlan || null,
        renewal_date: form.renewalDate || null,
        line_items: items,
        subtotal,
        tax_rate: form.taxRate,
        tax_amount: taxAmount,
        total: grand,
        currency: form.currency,
        status: 'pending' as const,
        notes: form.clientNotes || null,
        updated_at: new Date().toISOString(),
      }

      if (savedInvoiceId) {
        const { error } = await supabase
          .from('invoices')
          .update(payload)
          .eq('id', savedInvoiceId)
        if (error) { setSaveError(error.message); return }
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(payload)
          .select('id')
          .single()
        if (error) { setSaveError(error.message); return }
        if (data) setSavedInvoiceId(data.id)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unexpected error. Please try again.')
      return
    } finally {
      setSaving(false)
    }
    setStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startOver() {
    setStep(1)
    setSavedInvoiceId(null)
    setItems([])
    setForm({
      clientName: '',
      contactName: '',
      clientEmail: '',
      clientPhone: '',
      serviceName: '',
      servicePlan: '',
      renewalDate: '',
      reminderDays: 7,
      clientNotes: '',
      bizName: profile?.business_name ?? '',
      bizEmail: profile?.business_email ?? '',
      currency: profile?.currency ?? 'NGN',
      taxRate: profile?.tax_rate ?? 7.5,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDownloadPdf() {
    const html = generatePdfHtml(form, items, invNumber, subtotal, taxAmount, grand)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  function buildCalendarLink(): string {
    if (!form.renewalDate) return '#'
    const start = new Date(form.renewalDate + 'T00:00:00')
    start.setDate(start.getDate() - form.reminderDays)
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dueFmt = new Date(form.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const evTitle = `Renewal reminder: ${form.clientName || 'Client'} — ${form.serviceName || 'Service'}`
    const evDesc = [
      `Client: ${form.clientName || 'Client'}`,
      `Service: ${form.serviceName || 'Service'}`,
      form.servicePlan ? `Plan: ${form.servicePlan}` : '',
      `Renewal date: ${dueFmt}`,
      `Invoice total: ${formatAmount(grand, form.currency)}`,
      form.clientNotes ? `\nNotes: ${form.clientNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evTitle)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(evDesc)}`
  }

  function buildWhatsAppLink(): string {
    const phone = form.clientPhone.replace(/\D/g, '')
    const dueFmt = form.renewalDate
      ? new Date(form.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''
    const biz = form.bizName || 'us'
    const svc = form.serviceName || 'your service'
    const plan = form.servicePlan ? ` (${form.servicePlan})` : ''
    const msg = [
      `Hello ${form.clientName || 'there'},`,
      ``,
      `This is a renewal reminder from *${biz}*.`,
      ``,
      `Your *${svc}${plan}* is due for renewal${dueFmt ? ` on *${dueFmt}*` : ''}.`,
      ``,
      `Invoice total: *${formatAmount(grand, form.currency)}*`,
      ``,
      form.clientNotes ? `${form.clientNotes}\n` : '',
      `Please reach out to confirm or arrange payment. Thank you!`,
      ``,
      `— ${biz}`,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')

    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    return `${base}?text=${encodeURIComponent(msg)}`
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <StepIndicator step={step} />

      {/* ── STEP 1 ─────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <Card>
            <SectionTitle>Client details</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Client / company name">
                <input
                  className={INPUT}
                  placeholder="Acme Corp"
                  value={form.clientName}
                  onChange={(e) => setField('clientName', e.target.value)}
                />
              </Field>
              <Field label="Contact person">
                <input
                  className={INPUT}
                  placeholder="Jane Smith"
                  value={form.contactName}
                  onChange={(e) => setField('contactName', e.target.value)}
                />
              </Field>
              <Field label="Email address">
                <input
                  className={INPUT}
                  type="email"
                  placeholder="jane@acme.com"
                  value={form.clientEmail}
                  onChange={(e) => setField('clientEmail', e.target.value)}
                />
              </Field>
              <Field label="WhatsApp number">
                <input
                  className={INPUT}
                  placeholder="+234 800 000 0000"
                  value={form.clientPhone}
                  onChange={(e) => setField('clientPhone', e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle>Service &amp; renewal</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="Service name">
                <input
                  className={INPUT}
                  placeholder="Website Hosting"
                  value={form.serviceName}
                  onChange={(e) => setField('serviceName', e.target.value)}
                />
              </Field>
              <Field label="Plan / package">
                <input
                  className={INPUT}
                  placeholder="Business Annual"
                  value={form.servicePlan}
                  onChange={(e) => setField('servicePlan', e.target.value)}
                />
              </Field>
              <Field label="Renewal date">
                <input
                  className={INPUT}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.renewalDate}
                  onChange={(e) => setField('renewalDate', e.target.value)}
                />
              </Field>
              <Field label="Remind me (days before)">
                <input
                  className={INPUT}
                  type="number"
                  min={1}
                  value={form.reminderDays}
                  onChange={(e) => setField('reminderDays', Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Message / notes for client">
              <textarea
                className={`${INPUT} resize-y min-h-[72px] leading-relaxed`}
                placeholder="Your subscription is due for renewal. Please find your invoice attached…"
                value={form.clientNotes}
                onChange={(e) => setField('clientNotes', e.target.value)}
              />
            </Field>
          </Card>

          <Card>
            <SectionTitle>Your business</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Business name">
                <input
                  className={INPUT}
                  placeholder="Your Agency Ltd"
                  value={form.bizName}
                  onChange={(e) => setField('bizName', e.target.value)}
                />
              </Field>
              <Field label="Your email">
                <input
                  className={INPUT}
                  type="email"
                  placeholder="hello@yourbusiness.com"
                  value={form.bizEmail}
                  onChange={(e) => setField('bizEmail', e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  className={INPUT}
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax / VAT %">
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.taxRate}
                  onChange={(e) => setField('taxRate', Number(e.target.value))}
                />
              </Field>
            </div>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button
              onClick={goStep2}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              Continue to invoice
              <ChevRight />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ─────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <Card>
            <SectionTitle>Invoice line items</SectionTitle>

            {/* Desktop table */}
            <div className="hidden sm:block mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <th className="text-left pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400" style={{ width: '42%' }}>Description</th>
                    <th className="text-left pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400" style={{ width: '12%' }}>Qty</th>
                    <th className="text-left pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400" style={{ width: '20%' }}>Unit price</th>
                    <th className="text-left pb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400" style={{ width: '18%' }}>Amount</th>
                    <th style={{ width: '8%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <td className="py-1.5 pr-2">
                        <input
                          className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300 focus:border-b focus:border-brand"
                          placeholder="e.g. Website hosting"
                          value={item.desc}
                          onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          className="w-12 bg-transparent outline-none text-sm text-gray-800 focus:border-b focus:border-brand"
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          className="w-20 bg-transparent outline-none text-sm text-gray-800 focus:border-b focus:border-brand"
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-1.5 text-sm font-medium text-gray-800 whitespace-nowrap">
                        {formatAmount(item.qty * item.price, form.currency)}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none px-1"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2 mb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface rounded-lg p-3"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-400">Item</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">Description</label>
                    <input
                      className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300 border-b border-black/10 focus:border-brand py-1"
                      placeholder="e.g. Website hosting"
                      value={item.desc}
                      onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Qty</label>
                      <input
                        className="w-full bg-transparent outline-none text-sm text-gray-800 border-b border-black/10 focus:border-brand py-1"
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Unit price</label>
                      <input
                        className="w-full bg-transparent outline-none text-sm text-gray-800 border-b border-black/10 focus:border-brand py-1"
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Amount</label>
                      <span className="text-sm font-semibold text-gray-800">
                        {formatAmount(item.qty * item.price, form.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item button */}
            <button
              onClick={() => addItem()}
              className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-black/[0.12] hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors mb-4"
            >
              <PlusSmall />
              Add line item
            </button>

            {/* Totals */}
            <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex justify-between text-sm text-gray-500 py-0.5">
                <span>Subtotal</span>
                <span>{formatAmount(subtotal, form.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 py-0.5">
                <span>Tax ({form.taxRate}%)</span>
                <span>{formatAmount(taxAmount, form.currency)}</span>
              </div>
              <div
                className="flex justify-between text-base font-semibold text-gray-900 py-2.5 mt-1"
                style={{ borderTop: '1.5px solid rgba(0,0,0,0.13)' }}
              >
                <span>Total due</span>
                <span>{formatAmount(grand, form.currency)}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button
              onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-black/[0.12] text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevLeft />
              Back
            </button>
            <button
              onClick={goStep3}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Preview & send'}
              {!saving && <ChevRight />}
            </button>
          </div>
          {saveError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {saveError}
            </p>
          )}
        </div>
      )}

      {/* ── STEP 3 ─────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <InvoicePreview
            form={form}
            items={items}
            invNumber={invNumber}
            subtotal={subtotal}
            taxAmount={taxAmount}
            grand={grand}
          />

          {/* Action card */}
          <Card className="mt-3">
            <SectionTitle>Schedule &amp; send</SectionTitle>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-white border border-black/[0.12] text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DownloadIcon />
                Download PDF
              </button>
              <a
                href={buildCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={form.renewalDate ? '' : 'pointer-events-none opacity-50'}
              >
                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#4285F4] hover:bg-[#2a70d6] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <CalendarIcon />
                  Add reminder to Google Calendar
                </button>
              </a>
              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#25D366] hover:bg-[#1eba58] text-white text-sm font-medium rounded-lg transition-colors">
                  <WhatsAppIcon />
                  Send invoice via WhatsApp
                </button>
              </a>
            </div>
            <p className="text-[11px] text-gray-400 mt-3.5 leading-relaxed">
              The WhatsApp message includes the client name, service, renewal date, and invoice total. The Calendar reminder fires {form.reminderDays} day{form.reminderDays !== 1 ? 's' : ''} before the renewal date.
            </p>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button
              onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-black/[0.12] text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevLeft />
              Edit invoice
            </button>
            <button
              onClick={startOver}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              <RefreshIcon />
              New renewal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
