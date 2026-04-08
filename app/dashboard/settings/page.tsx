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

  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    business_email: '',
    currency: 'NGN',
    tax_rate: 7.5,
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
        setForm({
          full_name: profile.full_name ?? '',
          business_name: profile.business_name ?? '',
          business_email: profile.business_email ?? '',
          currency: profile.currency ?? 'NGN',
          tax_rate: profile.tax_rate ?? 7.5,
        })
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
          <div
            className="bg-white rounded-xl p-5 mb-4"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
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
          <div
            className="bg-white rounded-xl p-5 mb-4"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
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
