'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatAmount, CURRENCY_OPTIONS } from '@/lib/format'
import { generateQuotePDF } from '@/lib/generateQuotePDF'
import type { Profile, Quote, LineItem } from '@/lib/types'

// ─── Icons ────────────────────────────────────────────────────────────────────

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
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.392A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.073-1.119l-.292-.173-3.014.842.857-2.939-.19-.301A8 8 0 1112 20z"/>
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
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
function SpinnerIcon() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
}

// ─── Styling ──────────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg bg-surface border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300 text-base text-gray-900'

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
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
    { n: 1, label: 'Client & Service', sub: 'Details & validity' },
    { n: 2, label: 'Quote items',       sub: 'Items & pricing'   },
    { n: 3, label: 'Preview & Send',    sub: 'PDF + WhatsApp'    },
  ]
  return (
    <div
      className="flex items-center bg-white rounded-xl px-3 py-3 mb-3"
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {steps.map((s, idx) => {
        const done   = s.n < step
        const active = s.n === step
        return (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all ${
                  done || active ? 'bg-brand text-white' : 'bg-surface text-gray-400'
                }`}
                style={{ border: done || active ? '1.5px solid #1D9E75' : '1.5px solid rgba(0,0,0,0.13)' }}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : s.n}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className={`text-[11px] font-medium truncate ${active ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{s.sub}</p>
              </div>
            </div>
            {idx < steps.length - 1 && <div className="w-3 h-px bg-black/10 flex-shrink-0 mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Quote preview ────────────────────────────────────────────────────────────

interface PreviewProps {
  form: FormData
  items: LineItem[]
  quoteNumber: string
  validUntil: string
  subtotal: number
  taxAmount: number
  grand: number
}

function QuotePreview({ form, items, quoteNumber, validUntil, subtotal, taxAmount, grand }: PreviewProps) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const validUntilFmt = validUntil
    ? new Date(validUntil + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const currency = form.currency

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#3B82F6]" style={{ fontFamily: 'Georgia, serif' }}>Quote</h2>
            <p className="text-xs text-gray-400 mt-1">
              {form.serviceName || 'Service'}
              {form.servicePlan ? ` — ${form.servicePlan}` : ''}
            </p>
          </div>
          <div className="text-xs text-gray-400 leading-7 sm:text-right">
            <p className="text-sm font-semibold text-gray-900">{form.bizName || 'Your Business'}</p>
            <p>{form.bizEmail}</p>
            <p className="mt-1">{quoteNumber}</p>
            <p>Issued: {today}</p>
            <p>Valid until: {validUntilFmt}</p>
            <div className="mt-1">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                Pending approval
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">From</p>
            <p className="text-xs text-gray-700 leading-6">
              {form.bizName || 'Your Business'}<br />{form.bizEmail}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Quote to</p>
            <p className="text-xs text-gray-700 leading-6">
              {form.clientName || 'Client'}
              {form.contactName && <><br />{form.contactName}</>}
              {form.clientEmail && <><br />{form.clientEmail}</>}
            </p>
          </div>
        </div>

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

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500 py-0.5">
            <span>Subtotal</span><span>{formatAmount(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-0.5">
            <span>Tax ({form.taxRate}%)</span><span>{formatAmount(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 py-2 mt-1" style={{ borderTop: '1.5px solid rgba(0,0,0,0.13)' }}>
            <span>Quote total</span><span>{formatAmount(grand, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FormData ─────────────────────────────────────────────────────────────────

interface FormData {
  clientName: string
  contactName: string
  clientEmail: string
  clientPhone: string
  serviceName: string
  servicePlan: string
  validityDays: number
  clientNotes: string
  bizName: string
  bizEmail: string
  currency: string
  taxRate: number
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  profile: Profile | null
  quote?: Quote | null
}

export default function NewQuoteForm({ profile, quote }: Props) {
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(quote?.id ?? null)
  const [savedValidUntil, setSavedValidUntil] = useState<string>('')
  const [quoteNumber] = useState(
    () => quote?.quote_number ?? `QUO-${Date.now().toString().slice(-6)}`
  )

  const [pdfLoading,      setPdfLoading]      = useState(false)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappError,   setWhatsappError]   = useState<string | null>(null)
  const [emailLoading,    setEmailLoading]    = useState(false)
  const [emailFeedback,   setEmailFeedback]   = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState<FormData>({
    clientName:   quote?.client_name   ?? '',
    contactName:  quote?.contact_name  ?? '',
    clientEmail:  quote?.client_email  ?? '',
    clientPhone:  quote?.client_phone  ?? '',
    serviceName:  quote?.service_name  ?? '',
    servicePlan:  quote?.service_plan  ?? '',
    validityDays: quote?.validity_days ?? 30,
    clientNotes:  quote?.notes         ?? '',
    bizName:  profile?.business_name  ?? '',
    bizEmail: profile?.business_email ?? '',
    currency: quote?.currency ?? profile?.currency ?? 'NGN',
    taxRate:  quote?.tax_rate ?? profile?.tax_rate  ?? 7.5,
  })

  const [items, setItems] = useState<LineItem[]>(
    Array.isArray(quote?.line_items) ? quote!.line_items : []
  )

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const subtotal  = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items])
  const taxAmount = useMemo(() => (subtotal * form.taxRate) / 100, [subtotal, form.taxRate])
  const grand     = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  function computeValidUntil() {
    const d = new Date()
    d.setDate(d.getDate() + form.validityDays)
    return d.toISOString().split('T')[0]
  }

  function getPDFData() {
    return {
      quoteNumber,
      bizName:    form.bizName,
      bizEmail:   form.bizEmail,
      clientName: form.clientName,
      contactName: form.contactName || undefined,
      clientEmail: form.clientEmail || undefined,
      serviceName: form.serviceName || undefined,
      servicePlan: form.servicePlan || undefined,
      validUntil: savedValidUntil || computeValidUntil(),
      currency: form.currency,
      taxRate:  form.taxRate,
      items:    items.map((i) => ({ desc: i.desc, qty: i.qty, price: i.price })),
      subtotal,
      taxAmount,
      grand,
    }
  }

  function addItem(desc = '', qty = 1, price = 0) {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev, { id, desc, qty, price }])
  }

  function updateItem(id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function goStep2() {
    if (items.length === 0) addItem(form.serviceName || 'Service quote', 1, 0)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function goStep3() {
    setSaving(true)
    setSaveError(null)
    const validUntilStr = computeValidUntil()
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setSaveError('Not authenticated. Please refresh and try again.'); return }

      const payload = {
        user_id:      user.id,
        quote_number: quoteNumber,
        client_name:  form.clientName || 'Client',
        client_email: form.clientEmail || null,
        client_phone: form.clientPhone || null,
        contact_name: form.contactName || null,
        service_name: form.serviceName || null,
        service_plan: form.servicePlan || null,
        validity_days: form.validityDays,
        valid_until:   validUntilStr,
        line_items:   items,
        subtotal,
        tax_rate:     form.taxRate,
        tax_amount:   taxAmount,
        total:        grand,
        currency:     form.currency,
        notes:        form.clientNotes || null,
        updated_at:   new Date().toISOString(),
      }

      if (savedQuoteId) {
        const { error } = await supabase.from('quotes').update(payload).eq('id', savedQuoteId)
        if (error) { setSaveError(error.message); return }
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert({ ...payload, status: 'draft' as const })
          .select('id')
          .single()
        if (error) { setSaveError(error.message); return }
        if (data) setSavedQuoteId(data.id)
      }
      setSavedValidUntil(validUntilStr)
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
    setSavedQuoteId(null)
    setSavedValidUntil('')
    setItems([])
    setEmailFeedback(null)
    setWhatsappError(null)
    setForm({
      clientName: '', contactName: '', clientEmail: '', clientPhone: '',
      serviceName: '', servicePlan: '', validityDays: 30, clientNotes: '',
      bizName:  profile?.business_name  ?? '',
      bizEmail: profile?.business_email ?? '',
      currency: profile?.currency ?? 'NGN',
      taxRate:  profile?.tax_rate  ?? 7.5,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDownloadPdf() {
    setPdfLoading(true)
    try {
      const doc = generateQuotePDF(getPDFData())
      const clientSlug = form.clientName.replace(/[^a-zA-Z0-9]/g, '_') || 'Client'
      doc.save(`${quoteNumber}-${clientSlug}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleWhatsApp() {
    setWhatsappLoading(true)
    setWhatsappError(null)

    const phone = form.clientPhone.replace(/\D/g, '')
    const biz   = form.bizName || 'us'
    const svc   = form.serviceName || 'your service'
    const plan  = form.servicePlan ? ` (${form.servicePlan})` : ''
    const validUntilDisplay = savedValidUntil
      ? new Date(savedValidUntil + 'T00:00:00').toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : ''

    let pdfUrl = ''
    try {
      const doc = generateQuotePDF(getPDFData())
      const pdfBlob = doc.output('blob')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
        const fileName = `${userId}/${quoteNumber}.pdf`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(fileName)
          pdfUrl = urlData?.publicUrl ?? ''
        } else {
          setWhatsappError('Could not upload PDF. WhatsApp message sent without PDF link.')
        }
      }
    } catch {
      setWhatsappError('Could not generate PDF. WhatsApp message sent without PDF link.')
    }

    const msgParts = [
      `Hello ${form.clientName || 'there'},`,
      ``,
      `${biz} has prepared a quote for *${svc}${plan}*.`,
      ``,
      `Quote total: *${formatAmount(grand, form.currency)}*`,
      ``,
      validUntilDisplay ? `This quote is valid until *${validUntilDisplay}*.` : `This quote is valid for *${form.validityDays} days*.`,
      ``,
      form.clientNotes ? `${form.clientNotes}\n` : '',
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
    setWhatsappLoading(false)
  }

  async function handleSendEmail() {
    if (!form.clientEmail) return
    setEmailLoading(true)
    setEmailFeedback(null)

    try {
      const doc = generateQuotePDF(getPDFData())
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          invoiceData: {
            invNumber:   quoteNumber,
            clientName:  form.clientName,
            bizName:     form.bizName,
            bizEmail:    form.bizEmail,
            serviceName: form.serviceName,
            servicePlan: form.servicePlan,
            validUntil:  savedValidUntil || computeValidUntil(),
            currency:    form.currency,
            taxRate:     form.taxRate,
            items:       items.map((i) => ({ desc: i.desc, qty: i.qty, price: i.price })),
            subtotal,
            taxAmount,
            grand,
          },
          recipientEmail: form.clientEmail,
          pdfBase64,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        setEmailFeedback({ type: 'error', message: json.error || 'Failed to send email.' })
      } else {
        setEmailFeedback({ type: 'success', message: `Quote sent to ${form.clientEmail}` })
        // Auto-update quote status to 'sent' if it was saved
        if (savedQuoteId) {
          const supabase = createClient()
          await supabase
            .from('quotes')
            .update({ status: 'sent', updated_at: new Date().toISOString() })
            .eq('id', savedQuoteId)
        }
      }
    } catch (err) {
      setEmailFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Unexpected error.' })
    } finally {
      setEmailLoading(false)
    }
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
                <input className={INPUT} placeholder="Acme Corp" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} />
              </Field>
              <Field label="Contact person">
                <input className={INPUT} placeholder="Jane Smith" value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} />
              </Field>
              <Field label="Email address">
                <input className={INPUT} type="email" placeholder="jane@acme.com" value={form.clientEmail} onChange={(e) => setField('clientEmail', e.target.value)} />
              </Field>
              <Field label="WhatsApp number">
                <input className={INPUT} placeholder="+234 800 000 0000" value={form.clientPhone} onChange={(e) => setField('clientPhone', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle>Service &amp; quote validity</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="Service name">
                <input className={INPUT} placeholder="Website Hosting" value={form.serviceName} onChange={(e) => setField('serviceName', e.target.value)} />
              </Field>
              <Field label="Plan / package">
                <input className={INPUT} placeholder="Business Annual" value={form.servicePlan} onChange={(e) => setField('servicePlan', e.target.value)} />
              </Field>
              <Field label="Quote valid for (days)">
                <input className={INPUT} type="number" min={1} value={form.validityDays} onChange={(e) => setField('validityDays', Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Message / notes for client">
              <textarea
                className={`${INPUT} resize-y min-h-[120px] leading-relaxed`}
                placeholder="We're pleased to provide this quote for your consideration. Please review and let us know if you'd like to proceed…"
                value={form.clientNotes}
                onChange={(e) => setField('clientNotes', e.target.value)}
              />
            </Field>
          </Card>

          <Card>
            <SectionTitle>Your business</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Business name">
                <input className={INPUT} placeholder="Your Agency Ltd" value={form.bizName} onChange={(e) => setField('bizName', e.target.value)} />
              </Field>
              <Field label="Your email">
                <input className={INPUT} type="email" placeholder="hello@yourbusiness.com" value={form.bizEmail} onChange={(e) => setField('bizEmail', e.target.value)} />
              </Field>
              <Field label="Currency">
                <select className={INPUT} value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tax / VAT %">
                <input className={INPUT} type="number" min={0} step={0.5} value={form.taxRate} onChange={(e) => setField('taxRate', Number(e.target.value))} />
              </Field>
            </div>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button
              onClick={goStep2}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              Continue to quote items
              <ChevRight />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ─────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <Card>
            <SectionTitle>Quote line items</SectionTitle>

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
                        <input className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300 focus:border-b focus:border-brand" placeholder="e.g. Website redesign" value={item.desc} onChange={(e) => updateItem(item.id, 'desc', e.target.value)} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input className="w-12 bg-transparent outline-none text-sm text-gray-800 focus:border-b focus:border-brand" type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input className="w-20 bg-transparent outline-none text-sm text-gray-800 focus:border-b focus:border-brand" type="number" min={0} step={0.01} value={item.price} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} />
                      </td>
                      <td className="py-1.5 text-sm font-medium text-gray-800 whitespace-nowrap">
                        {formatAmount(item.qty * item.price, form.currency)}
                      </td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none px-1">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.id} className="bg-surface rounded-lg p-3" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-400">Item</span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                  </div>
                  <div className="mb-2">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">Description</label>
                    <input className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-300 border-b border-black/10 focus:border-brand py-1" placeholder="e.g. Website redesign" value={item.desc} onChange={(e) => updateItem(item.id, 'desc', e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Qty</label>
                      <input className="w-full bg-transparent outline-none text-sm text-gray-800 border-b border-black/10 focus:border-brand py-1" type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} />
                    </div>
                    <div className="flex-[2]">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Unit price</label>
                      <input className="w-full bg-transparent outline-none text-sm text-gray-800 border-b border-black/10 focus:border-brand py-1" type="number" min={0} step={0.01} value={item.price} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} />
                    </div>
                    <div className="flex-1 text-right">
                      <label className="text-[11px] text-gray-400 font-medium block mb-1">Amount</label>
                      <span className="text-sm font-semibold text-gray-800">{formatAmount(item.qty * item.price, form.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => addItem()} className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-black/[0.12] hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors mb-4">
              <PlusSmall />
              Add line item
            </button>

            <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex justify-between text-sm text-gray-500 py-0.5"><span>Subtotal</span><span>{formatAmount(subtotal, form.currency)}</span></div>
              <div className="flex justify-between text-sm text-gray-500 py-0.5"><span>Tax ({form.taxRate}%)</span><span>{formatAmount(taxAmount, form.currency)}</span></div>
              <div className="flex justify-between text-base font-semibold text-gray-900 py-2.5 mt-1" style={{ borderTop: '1.5px solid rgba(0,0,0,0.13)' }}>
                <span>Quote total</span>
                <span>{formatAmount(grand, form.currency)}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2 px-4 py-3 bg-white border border-black/[0.12] text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <ChevLeft />
              Back
            </button>
            <button onClick={goStep3} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Preview & send'}
              {!saving && <ChevRight />}
            </button>
          </div>
          {saveError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{saveError}</p>
          )}
        </div>
      )}

      {/* ── STEP 3 ─────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <QuotePreview
            form={form}
            items={items}
            quoteNumber={quoteNumber}
            validUntil={savedValidUntil}
            subtotal={subtotal}
            taxAmount={taxAmount}
            grand={grand}
          />

          <Card className="mt-3">
            <SectionTitle>Send quote</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#1a1a18] hover:bg-[#2a2a26] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {pdfLoading ? <SpinnerIcon /> : <DownloadIcon />}
                {pdfLoading ? 'Generating…' : 'Download quote PDF'}
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                disabled={whatsappLoading}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-[#25D366] hover:bg-[#1eba58] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {whatsappLoading ? <SpinnerIcon /> : <WhatsAppIcon />}
                {whatsappLoading ? 'Preparing…' : 'Send quote via WhatsApp'}
              </button>
              {whatsappError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{whatsappError}</p>
              )}

              {/* Email */}
              <button
                onClick={handleSendEmail}
                disabled={emailLoading || !form.clientEmail}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-white border border-black/[0.12] text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {emailLoading ? <SpinnerIcon /> : <EmailIcon />}
                {emailLoading
                  ? 'Sending…'
                  : form.clientEmail
                  ? 'Send quote via email'
                  : 'Send quote via email (add email in step 1)'}
              </button>
              {emailFeedback && (
                <p className={`text-xs rounded-lg px-3 py-2 ${emailFeedback.type === 'success' ? 'bg-[#E1F5EE] text-[#085041] border border-[#b3dfd0]' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {emailFeedback.message}
                </p>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-3.5 leading-relaxed">
              This quote is valid for {form.validityDays} day{form.validityDays !== 1 ? 's' : ''} from today. Sending via email automatically marks the quote as Sent.
            </p>
          </Card>

          <div className="flex gap-2.5 mt-1">
            <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2 px-4 py-3 bg-white border border-black/[0.12] text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <ChevLeft />
              Edit quote
            </button>
            <button onClick={startOver} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors">
              <RefreshIcon />
              New quote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
