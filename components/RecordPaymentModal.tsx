'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatAmount } from '@/lib/format'
import { generatePDF, invoiceToPDFData } from '@/lib/generatePDF'
import type { Invoice, Payment, Profile } from '@/lib/types'

const INPUT =
  'w-full px-3 py-2 rounded-lg bg-white border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-sm text-gray-900 placeholder:text-gray-300'

interface Props {
  invoice: Invoice
  profile?: Profile | null
  logoDataUrl?: string
  onClose: () => void
  onSuccess: (payment: Payment, newAmountPaid: number, isFullyPaid: boolean) => void
}

export default function RecordPaymentModal({ invoice, profile, logoDataUrl, onClose, onSuccess }: Props) {
  const currency    = invoice.currency ?? 'NGN'
  const alreadyPaid = invoice.amount_paid ?? 0
  const balance     = invoice.total - alreadyPaid

  const [amount,      setAmount]      = useState(balance.toFixed(2))
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [history,     setHistory]     = useState<Payment[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: true })
      .then((result: { data: unknown }) => {
        setHistory((result.data as Payment[]) ?? [])
        setHistoryLoading(false)
      })
  }, [invoice.id])

  async function handleSubmit() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount greater than zero.'); return }
    if (amt > balance + 0.001) {
      setError(`Amount cannot exceed the balance of ${formatAmount(balance, currency)}.`)
      return
    }
    if (!paymentDate) { setError('Enter a payment date.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) { setError('Not authenticated.'); return }

      const { data: paymentData, error: payErr } = await supabase
        .from('invoice_payments')
        .insert({
          invoice_id:   invoice.id,
          user_id:      userId,
          amount:       amt,
          currency,
          payment_date: paymentDate,
          notes:        notes.trim() || null,
        })
        .select()
        .single()
      if (payErr) { setError(payErr.message); return }

      const newAmountPaid = alreadyPaid + amt
      const isFullyPaid   = newAmountPaid >= invoice.total - 0.001
      const nowIso        = new Date().toISOString()

      const { error: invErr } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status:      isFullyPaid ? 'paid' : 'partial',
          ...(isFullyPaid ? { payment_date: nowIso } : {}),
          updated_at:  nowIso,
        })
        .eq('id', invoice.id)
      if (invErr) { setError(invErr.message); return }

      onSuccess(paymentData as Payment, newAmountPaid, isFullyPaid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setSaving(false)
    }
  }

  function handleDownloadReceipt(payment: Payment, cumulativePaid: number) {
    const isFullyPaidAtThatPoint = cumulativePaid >= invoice.total - 0.001
    const updatedInvoice: Invoice = {
      ...invoice,
      status: isFullyPaidAtThatPoint ? 'paid' : 'partial',
      amount_paid: cumulativePaid,
    }
    const pdfData = invoiceToPDFData(updatedInvoice, profile ?? null, logoDataUrl, {
      amountThisPayment: payment.amount,
      totalAmountPaid:   cumulativePaid,
      balanceRemaining:  Math.max(0, invoice.total - cumulativePaid),
      paymentDate:       payment.payment_date,
    })
    const doc = generatePDF(pdfData)
    doc.save(`${invoice.inv_number}-receipt-${payment.id.slice(0, 8)}.pdf`)
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-sm overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">Record payment</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.inv_number} · {invoice.client_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Balance summary */}
        <div className="px-5 pt-4 pb-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Invoice total</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{formatAmount(invoice.total, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Paid so far</p>
            <p className="text-sm font-bold text-brand mt-0.5">{formatAmount(alreadyPaid, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Balance</p>
            <p className="text-sm font-bold text-amber-600 mt-0.5">{formatAmount(balance, currency)}</p>
          </div>
        </div>

        {/* Payment history */}
        {!historyLoading && history.length > 0 && (
          <div
            className="mx-5 mb-3 rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#fafaf7' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 pt-2.5 pb-1.5">
              Payment history
            </p>
            {history.reduce<{ rows: ReactNode[]; running: number }>(
              (acc, p) => {
                const running = acc.running + p.amount
                acc.rows.push(
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{formatAmount(p.amount, p.currency)}</p>
                      {p.notes && <p className="text-[10px] text-gray-400 mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-gray-400">
                        {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                      <button
                        onClick={() => handleDownloadReceipt(p, running)}
                        title="Download receipt"
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                        aria-label="Download receipt"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
                return { rows: acc.rows, running }
              },
              { rows: [], running: 0 }
            ).rows}
          </div>
        )}

        {/* Form */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Amount ({currency})
            </label>
            <input
              className={INPUT}
              type="number"
              min={0.01}
              step={0.01}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Payment date</label>
            <input
              className={INPUT}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notes (optional)</label>
            <input
              className={INPUT}
              placeholder="e.g. First instalment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-black/10 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Record payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
