'use client'

import { useState } from 'react'
import type { RecurringFrequency } from '@/lib/types'

interface Props {
  invoiceId: string
  clientName: string
  isOpen: boolean
  existingFrequency?: RecurringFrequency
  existingStartDate?: string
  onClose: () => void
  onSaved: () => void
}

const FREQUENCIES: { value: RecurringFrequency; label: string; desc: string }[] = [
  { value: 'monthly',   label: 'Monthly',   desc: 'New invoice every month'   },
  { value: 'quarterly', label: 'Quarterly', desc: 'New invoice every 3 months' },
  { value: 'yearly',    label: 'Yearly',    desc: 'New invoice every year'     },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function RecurringModal({ invoiceId, clientName, isOpen, existingFrequency, existingStartDate, onClose, onSaved }: Props) {
  const [frequency, setFrequency] = useState<RecurringFrequency>(existingFrequency ?? 'monthly')
  const [startDate, setStartDate] = useState(existingStartDate ?? todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/recurring/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, frequency, startDate }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to save schedule')
        setSaving(false)
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-900">Make recurring</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          A copy of this invoice will be auto-generated for <strong className="text-gray-600">{clientName}</strong> on the selected schedule.
        </p>

        {/* Frequency */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Frequency</p>
          <div className="grid grid-cols-3 gap-2">
            {FREQUENCIES.map(f => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`flex flex-col items-center gap-0.5 px-2 py-3 rounded-xl border text-center transition-all ${
                  frequency === f.value
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start date */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            First invoice date
          </label>
          <input
            type="date"
            value={startDate}
            min={todayStr()}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <p className="mt-1.5 text-[11px] text-gray-400">
            Subsequent invoices will be generated automatically on the same day each {frequency === 'quarterly' ? '3 months' : frequency === 'yearly' ? 'year' : 'month'}.
          </p>
        </div>

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  )
}
