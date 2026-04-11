'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CURRENCY_OPTIONS } from '@/lib/format'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg bg-surface border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300 text-base text-gray-900'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{children}</p>
    </div>
  )
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showInternational, setShowInternational] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    business_email: '',
    currency: 'NGN',
    tax_rate: 7.5,
    bank_name: '',
    account_name: '',
    account_number: '',
    bank_country: 'Nigeria',
    swift_code: '',
    iban: '',
  })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        const swiftCode = profile.swift_code ?? ''
        const iban = profile.iban ?? ''
        setForm({
          full_name: profile.full_name ?? '',
          business_name: profile.business_name ?? '',
          business_email: profile.business_email ?? '',
          currency: profile.currency ?? 'NGN',
          tax_rate: profile.tax_rate ?? 7.5,
          bank_name: profile.bank_name ?? '',
          account_name: profile.account_name ?? '',
          account_number: profile.account_number ?? '',
          bank_country: profile.bank_country ?? 'Nigeria',
          swift_code: swiftCode,
          iban: iban,
        })
        if (swiftCode || iban) setShowInternational(true)
      }
      setLoading(false)
    }

    load()
  }, [])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFeedback(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name || null,
          business_name: form.business_name || null,
          business_email: form.business_email || null,
          currency: form.currency,
          tax_rate: form.tax_rate,
          bank_name: form.bank_name || null,
          account_name: form.account_name || null,
          account_number: form.account_number || null,
          bank_country: form.bank_country || 'Nigeria',
          swift_code: form.swift_code || null,
          iban: form.iban || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        setFeedback({ type: 'error', message: error.message })
      } else {
        setFeedback({ type: 'success', message: 'Settings saved successfully.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and business defaults.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-3">Loading settings…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Profile */}
          <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
            <SectionTitle>Your profile</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <input
                  className={INPUT}
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={(e) => setField('full_name', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Business */}
          <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
            <SectionTitle>Business defaults</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business name">
                <input
                  className={INPUT}
                  placeholder="Your Agency Ltd"
                  value={form.business_name}
                  onChange={(e) => setField('business_name', e.target.value)}
                />
              </Field>
              <Field label="Business email">
                <input
                  className={INPUT}
                  type="email"
                  placeholder="hello@yourbusiness.com"
                  value={form.business_email}
                  onChange={(e) => setField('business_email', e.target.value)}
                />
              </Field>
              <Field label="Default currency">
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
              <Field label="Default tax / VAT %">
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.tax_rate}
                  onChange={(e) => setField('tax_rate', Number(e.target.value))}
                />
              </Field>
            </div>
          </div>

          {/* Payment details */}
          <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
            <SectionTitle>Payment details</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label="Bank name">
                <input
                  className={INPUT}
                  placeholder="First Bank Nigeria"
                  value={form.bank_name}
                  onChange={(e) => setField('bank_name', e.target.value)}
                />
              </Field>
              <Field label="Account name">
                <input
                  className={INPUT}
                  placeholder="Jane Smith"
                  value={form.account_name}
                  onChange={(e) => setField('account_name', e.target.value)}
                />
              </Field>
              <Field label="Account number">
                <input
                  className={INPUT}
                  placeholder="0123456789"
                  value={form.account_number}
                  onChange={(e) => setField('account_number', e.target.value)}
                />
              </Field>
              <Field label="Country">
                <input
                  className={INPUT}
                  placeholder="Nigeria"
                  value={form.bank_country}
                  onChange={(e) => setField('bank_country', e.target.value)}
                />
              </Field>
            </div>

            {/* International toggle */}
            <button
              type="button"
              onClick={() => setShowInternational((v) => !v)}
              className="flex items-center gap-2 text-sm text-brand font-medium hover:text-brand-dark transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showInternational ? 'rotate-45' : ''}`}
              >
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {showInternational ? 'Hide international details' : 'Add international details'}
            </button>

            {showInternational && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                <Field label="SWIFT / BIC code">
                  <input
                    className={INPUT}
                    placeholder="FBNINGLA"
                    value={form.swift_code}
                    onChange={(e) => setField('swift_code', e.target.value)}
                  />
                </Field>
                <Field label="IBAN">
                  <input
                    className={INPUT}
                    placeholder="GB29 NWBK 6016 1331 9268 19"
                    value={form.iban}
                    onChange={(e) => setField('iban', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                feedback.type === 'success'
                  ? 'bg-[#E1F5EE] text-[#085041]'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save settings'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
