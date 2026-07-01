'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CURRENCY_OPTIONS } from '@/lib/format'
import type { BankAccount, UserSubscription, TeamMember } from '@/lib/types'
import { maskAccountNumber } from '@/components/BankAccountSelector'
import UpgradeModal from '@/components/UpgradeModal'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg bg-surface border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300 text-base text-gray-900'

const MAX_ACCOUNTS = 10
const STARTER_MAX_ACCOUNTS = 1

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-gray-500">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
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

interface AccountFormState {
  account_label: string
  bank_name: string
  account_name: string
  account_number: string
  currency: string
  bank_country: string
  swift_code: string
  iban: string
  is_default: boolean
}

const EMPTY_FORM: AccountFormState = {
  account_label: '',
  bank_name: '',
  account_name: '',
  account_number: '',
  currency: 'NGN',
  bank_country: 'Nigeria',
  swift_code: '',
  iban: '',
  is_default: false,
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    business_name: '',
    business_email: '',
    currency: 'NGN',
    tax_rate: 7.5,
  })

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [usage, setUsage] = useState<{ invoices_created: number; quotes_created: number } | null>(null)
  const [billingCurrency, setBillingCurrencyState] = useState<'NGN' | 'USD'>('NGN')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_FORM)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Team members (Agency plan)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const month = new Date().toISOString().slice(0, 7)
      const [profileRes, accountsRes, subRes, usageRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase.from('user_subscriptions').select('*').eq('user_id', user.id).single(),
        supabase.from('usage_tracking').select('*').eq('user_id', user.id).eq('billing_month', month).single(),
      ])

      if (profileRes.data) {
        setProfileForm({
          full_name: profileRes.data.full_name ?? '',
          business_name: profileRes.data.business_name ?? '',
          business_email: profileRes.data.business_email ?? '',
          currency: profileRes.data.currency ?? 'NGN',
          tax_rate: profileRes.data.tax_rate ?? 7.5,
        })
        setLogoUrl(profileRes.data.logo_url ?? null)
        setBillingCurrencyState(profileRes.data.billing_currency ?? 'NGN')
      }
      if (accountsRes.data) setAccounts(accountsRes.data as BankAccount[])
      if (subRes.data) {
        setSubscription(subRes.data as UserSubscription)
        if ((subRes.data as UserSubscription).plan_name === 'agency') {
          setTeamLoading(true)
          const { data: members } = await supabase
            .from('team_members')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true })
          if (members) setTeamMembers(members as TeamMember[])
          setTeamLoading(false)
        }
      }
      if (usageRes.data) setUsage(usageRes.data)
      setLoading(false)
    }

    load()
  }, [])

  function setProfileField<K extends keyof typeof profileForm>(key: K, value: (typeof profileForm)[K]) {
    setProfileForm((prev) => ({ ...prev, [key]: value }))
    setFeedback(null)
  }

  function setAccountField<K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) {
    setAccountForm((prev) => ({ ...prev, [key]: value }))
    setAccountError(null)
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name || null,
          business_name: profileForm.business_name || null,
          business_email: profileForm.business_email || null,
          currency: profileForm.currency,
          tax_rate: profileForm.tax_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        setFeedback({ type: 'error', message: error.message })
      } else {
        setFeedback({ type: 'success', message: 'Profile saved.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!userId) return
    if (file.size > 2 * 1024 * 1024) { setLogoFeedback('Logo must be under 2 MB.'); return }
    if (!file.type.startsWith('image/')) { setLogoFeedback('Only image files are allowed.'); return }

    setLogoUploading(true)
    setLogoFeedback(null)
    const supabase = createClient()

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${userId}/logo.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) { setLogoFeedback(uploadErr.message); return }

      const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
      const publicUrl = urlData?.publicUrl ?? null

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (updateErr) { setLogoFeedback(updateErr.message); return }

      setLogoUrl(publicUrl)
      setLogoFeedback('Logo uploaded.')
    } catch {
      setLogoFeedback('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    if (!userId || !logoUrl) return
    setLogoUploading(true)
    setLogoFeedback(null)
    const supabase = createClient()

    try {
      const path = logoUrl.split('/invoices/')[1]
      if (path) await supabase.storage.from('invoices').remove([path])
      await supabase
        .from('profiles')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', userId)
      setLogoUrl(null)
    } catch {
      setLogoFeedback('Could not remove logo.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleCancelSubscription() {
    if (!userId || !subscription?.paystack_subscription_code) return
    setCancelLoading(true)
    try {
      await fetch('/api/paystack/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionCode: subscription.paystack_subscription_code }),
      })
      setSubscription(s => s ? { ...s, cancel_at_period_end: true } : s)
      setCancelConfirm(false)
    } finally {
      setCancelLoading(false)
    }
  }

  const isStarter = !subscription || subscription.plan_name === 'starter'
  const maxAccounts = isStarter ? STARTER_MAX_ACCOUNTS : MAX_ACCOUNTS

  function startAdd() {
    if (isStarter && accounts.length >= STARTER_MAX_ACCOUNTS) {
      setUpgradeOpen(true)
      return
    }
    setAdding(true)
    setEditingId(null)
    const willBeFirst = accounts.length === 0
    setAccountForm({ ...EMPTY_FORM, currency: profileForm.currency, is_default: willBeFirst })
    setAccountError(null)
  }

  function startEdit(account: BankAccount) {
    setEditingId(account.id)
    setAdding(false)
    setAccountForm({
      account_label: account.account_label,
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
      currency: account.currency,
      bank_country: account.bank_country,
      swift_code: account.swift_code ?? '',
      iban: account.iban ?? '',
      is_default: account.is_default,
    })
    setAccountError(null)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
    setAccountForm(EMPTY_FORM)
    setAccountError(null)
  }

  async function handleAccountSubmit() {
    if (!userId) return
    if (!accountForm.account_label.trim()) { setAccountError('Account label is required.'); return }
    if (!accountForm.bank_name.trim())    { setAccountError('Bank name is required.'); return }
    if (!accountForm.account_name.trim()) { setAccountError('Account name is required.'); return }
    if (!accountForm.account_number.trim()){ setAccountError('Account number is required.'); return }

    if (adding && accounts.length >= maxAccounts) {
      if (isStarter) {
        setUpgradeOpen(true)
        return
      }
      setAccountError(`You can save up to ${MAX_ACCOUNTS} bank accounts.`)
      return
    }

    setAccountSaving(true)
    setAccountError(null)
    const supabase = createClient()

    try {
      // If setting this account as default, clear default on all others first
      if (accountForm.is_default) {
        const { error: clearErr } = await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true)
        if (clearErr) { setAccountError(clearErr.message); setAccountSaving(false); return }
      }

      const payload = {
        account_label: accountForm.account_label.trim(),
        bank_name: accountForm.bank_name.trim(),
        account_name: accountForm.account_name.trim(),
        account_number: accountForm.account_number.trim(),
        currency: accountForm.currency,
        bank_country: accountForm.bank_country || 'Nigeria',
        swift_code: accountForm.swift_code.trim() || null,
        iban: accountForm.iban.trim() || null,
        is_default: accountForm.is_default,
      }

      if (editingId) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(payload)
          .eq('id', editingId)
        if (error) { setAccountError(error.message); return }
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert({ ...payload, user_id: userId })
        if (error) { setAccountError(error.message); return }
      }

      // Refresh list
      const { data: list } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      if (list) setAccounts(list as BankAccount[])

      cancelForm()
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    if (!userId) return
    const supabase = createClient()

    // Optimistic
    setAccounts((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))

    await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true)
      .neq('id', id)

    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id)

    if (error) {
      setFeedback({ type: 'error', message: `Set default failed: ${error.message}` })
      // Reload to recover
      const { data: list } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      if (list) setAccounts(list as BankAccount[])
    }
  }

  async function handleDelete(id: string) {
    const target = accounts.find((a) => a.id === id)
    if (!target) return
    if (target.is_default && accounts.length === 1) {
      setFeedback({ type: 'error', message: 'Cannot delete the only default account. Add another account first.' })
      setConfirmDeleteId(null)
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
    if (error) {
      setFeedback({ type: 'error', message: error.message })
    } else {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      // If we just deleted the default and there are others, promote the first remaining
      if (target.is_default) {
        const next = accounts.filter((a) => a.id !== id)[0]
        if (next) await handleSetDefault(next.id)
      }
    }
    setConfirmDeleteId(null)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { setInviteError('Email is required.'); return }
    setInviteLoading(true)
    setInviteError(null)
    setInviteFeedback(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setInviteError(json.error ?? 'Failed to send invite.')
      } else {
        setInviteFeedback(`Invite sent to ${inviteEmail.trim()}.`)
        setInviteEmail('')
        setInviteRole('member')
      }
    } catch {
      setInviteError('An unexpected error occurred.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingMemberId(memberId)
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' })
      if (res.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
      } else {
        const json = await res.json()
        setFeedback({ type: 'error', message: json.error ?? 'Failed to remove member.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Unexpected error removing member.' })
    } finally {
      setRemovingMemberId(null)
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
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and bank accounts.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-3">Loading settings…</p>
        </div>
      ) : (
        <>
          <form onSubmit={handleProfileSubmit}>
            {/* Profile */}
            <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
              <SectionTitle>Your profile</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <input
                    className={INPUT}
                    placeholder="Jane Smith"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileField('full_name', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* Business defaults */}
            <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
              <SectionTitle>Business defaults</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Business name">
                  <input
                    className={INPUT}
                    placeholder="Your Agency Ltd"
                    value={profileForm.business_name}
                    onChange={(e) => setProfileField('business_name', e.target.value)}
                  />
                </Field>
                <Field label="Business email">
                  <input
                    className={INPUT}
                    type="email"
                    placeholder="hello@yourbusiness.com"
                    value={profileForm.business_email}
                    onChange={(e) => setProfileField('business_email', e.target.value)}
                  />
                </Field>
                <Field label="Default currency">
                  <select
                    className={INPUT}
                    value={profileForm.currency}
                    onChange={(e) => setProfileField('currency', e.target.value)}
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Default tax / VAT %">
                  <input
                    className={INPUT}
                    type="number"
                    min={0}
                    step={0.5}
                    value={profileForm.tax_rate}
                    onChange={(e) => setProfileField('tax_rate', Number(e.target.value))}
                  />
                </Field>
              </div>

              {/* Brand logo */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-medium text-gray-500 mb-3">Brand logo</p>
                <div className="flex items-center gap-4 flex-wrap">
                  {logoUrl && (
                    <div
                      className="flex items-center justify-center rounded-lg overflow-hidden bg-gray-50"
                      style={{ width: 96, height: 48, border: '1px solid rgba(0,0,0,0.08)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Business logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                      {logoUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          {logoUrl ? 'Change logo' : 'Upload logo'}
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        disabled={logoUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        disabled={logoUploading}
                        onClick={handleLogoRemove}
                        className="text-xs text-red-500 hover:text-red-600 text-left disabled:opacity-50"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 w-full">Shown in invoice PDFs. PNG or JPG, max 2 MB.</p>
                  {logoFeedback && (
                    <p className={`text-xs w-full ${logoFeedback === 'Logo uploaded.' ? 'text-brand' : 'text-red-600'}`}>
                      {logoFeedback}
                    </p>
                  )}
                </div>
              </div>
            </div>

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

            <button
              type="submit"
              disabled={saving}
              className="mb-8 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save profile'
              )}
            </button>
          </form>

          {/* Bank accounts manager */}
          <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Bank accounts ({accounts.length}/{isStarter ? STARTER_MAX_ACCOUNTS : MAX_ACCOUNTS})
                </p>
              </div>
              {!adding && !editingId && accounts.length < maxAccounts && (
                <button
                  onClick={startAdd}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-md hover:bg-brand-dark transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add bank account
                </button>
              )}
            </div>

            {/* Account cards */}
            {accounts.length === 0 && !adding && (
              <div className="rounded-lg p-4 text-center text-sm text-gray-500 bg-surface">
                No bank accounts yet. Add one to start receiving payments.
              </div>
            )}

            <div className="flex flex-col gap-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-lg p-3.5"
                  style={{ background: '#fafaf7', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  {editingId === account.id ? (
                    <AccountForm
                      form={accountForm}
                      setField={setAccountField}
                      onSave={handleAccountSubmit}
                      onCancel={cancelForm}
                      saving={accountSaving}
                      error={accountError}
                      isEditing
                      lockDefaultUncheck={account.is_default && accounts.filter((a) => a.is_default).length === 1}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{account.account_label}</p>
                          {account.is_default && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E1F5EE] text-[#085041]">
                              Default
                            </span>
                          )}
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-gray-500" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                            {account.currency}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{account.bank_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                          {maskAccountNumber(account.account_number)} · {account.account_name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => startEdit(account)}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSetDefault(account.id)}
                          disabled={account.is_default}
                          className="text-xs font-medium text-brand hover:text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {account.is_default ? 'Default' : 'Set as default'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(account.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add form */}
              {adding && (
                <div
                  className="rounded-lg p-3.5"
                  style={{ background: '#fafaf7', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <AccountForm
                    form={accountForm}
                    setField={setAccountField}
                    onSave={handleAccountSubmit}
                    onCancel={cancelForm}
                    saving={accountSaving}
                    error={accountError}
                    isEditing={false}
                    lockDefaultUncheck={accounts.length === 0}
                  />
                </div>
              )}
            </div>

            {accounts.length >= maxAccounts && !adding && !editingId && (
              isStarter ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-amber-50" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                  <p className="text-xs text-amber-700">Starter plan is limited to {STARTER_MAX_ACCOUNTS} bank account. Upgrade to add more.</p>
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="flex-shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                  >
                    Upgrade
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-3">Maximum {MAX_ACCOUNTS} bank accounts reached.</p>
              )
            )}
          </div>
        </>
      )}

      {/* ── Billing section ────────────────────────────────────────────── */}
      <div className="mt-8 mb-4">
        <SectionTitle>Billing &amp; Subscription</SectionTitle>

        {/* Current plan card */}
        <div
          className="bg-white rounded-xl p-4 mb-3"
          style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current plan</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900 capitalize">
                  {subscription?.plan_name ?? 'Starter'}
                </span>
                {subscription?.status && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    subscription.status === 'active' ? 'bg-brand/10 text-brand' :
                    subscription.status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                    subscription.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {subscription.status === 'active' ? 'Active' :
                     subscription.status === 'past_due' ? 'Past due' :
                     subscription.status === 'cancelled' ? 'Cancelled' : subscription.status}
                  </span>
                )}
                {subscription?.cancel_at_period_end && (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Cancels {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'at period end'}
                  </span>
                )}
              </div>
              {subscription && subscription.plan_name !== 'starter' && (
                <p className="text-xs text-gray-400 mt-1">
                  {subscription.billing_interval === 'monthly' ? 'Monthly' : 'Yearly'} · {subscription.billing_currency} ·{' '}
                  {subscription.current_period_end
                    ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : ''}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {(!subscription || subscription.plan_name === 'starter') && (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors"
                >
                  Upgrade
                </button>
              )}
              {subscription && subscription.plan_name !== 'starter' && !subscription.cancel_at_period_end && (
                <>
                  {subscription.billing_interval === 'monthly' && (
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/10 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Switch to yearly
                    </button>
                  )}
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Cancel subscription
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Usage (Starter only) */}
        {(!subscription || subscription.plan_name === 'starter') && usage && (
          <div
            className="bg-white rounded-xl p-4 mb-3"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <p className="text-xs text-gray-400 mb-3">Usage this month</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Invoices</span>
                  <span>{usage.invoices_created} / 5</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usage.invoices_created / 5) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Quotes</span>
                  <span>{usage.quotes_created} / 3</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usage.quotes_created / 3) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Resets on the 1st of next month.
            </p>
          </div>
        )}

        {/* Billing currency */}
        <div
          className="bg-white rounded-xl p-4"
          style={{ border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <p className="text-xs text-gray-400 mb-2">Billing currency</p>
          <div className="grid grid-cols-2 gap-2">
            {(['NGN', 'USD'] as const).map(c => (
              <button
                key={c}
                type="button"
                disabled={saving}
                onClick={async () => {
                  setBillingCurrencyState(c)
                  const supabase = createClient()
                  await supabase.from('profiles').update({ billing_currency: c }).eq('id', userId!)
                }}
                className={`px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                  billingCurrency === c
                    ? 'border-brand bg-brand/5 text-brand font-medium'
                    : 'border-black/10 bg-surface text-gray-700'
                }`}
              >
                {c === 'NGN' ? 'NGN — Nigerian Naira ₦' : 'USD — US Dollar $'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Team Members (Agency plan only) */}
      {subscription?.plan_name === 'agency' && (
        <div className="mt-8 mb-4">
          <SectionTitle>Team members</SectionTitle>

          <div className="bg-white rounded-xl p-5 mb-4" style={cardStyle}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Invite team members to access and manage your workspace. They can create invoices, quotes, and record payments on your behalf.
            </p>

            {/* Invite form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="email"
                className={`${INPUT} flex-1`}
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
              />
              <select
                className={`${INPUT} w-full sm:w-36`}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {inviteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.23 19.79 19.79 0 0 1 1.61 4.6 2 2 0 0 1 3.6 2.4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.5v-.58z"/>
                    <line x1="18" y1="6" x2="23" y2="1"/>
                    <line x1="23" y1="6" x2="18" y2="1"/>
                  </svg>
                )}
                Send invite
              </button>
            </div>

            {inviteError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{inviteError}</p>
            )}
            {inviteFeedback && (
              <p className="text-xs text-brand bg-[#E1F5EE] rounded-lg px-3 py-2 mb-3">{inviteFeedback}</p>
            )}

            {/* Members list */}
            {teamLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                Loading members…
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="rounded-lg p-4 text-center text-sm text-gray-400 bg-surface">
                No team members yet. Invite someone above.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-3"
                    style={{ background: '#fafaf7', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.member_email ?? member.member_user_id}</p>
                      {member.member_name && (
                        <p className="text-xs text-gray-400">{member.member_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize bg-surface text-gray-500" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {removingMemberId === member.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade modal */}
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {/* Cancel confirmation */}
      {cancelConfirm && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setCancelConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-5 w-full max-w-sm"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}
          >
            <p className="text-sm font-semibold text-gray-900 mb-1">Cancel subscription?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              You&rsquo;ll keep access until{' '}
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'the end of your billing period'}
              , then revert to Starter.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-black/10 rounded-lg hover:bg-gray-50"
              >
                Keep subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60"
              >
                {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-5 w-full max-w-sm"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            }}
          >
            <p className="text-sm font-semibold text-gray-900 mb-1">Delete bank account?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Existing invoices will keep their saved snapshot. Future invoices won&rsquo;t be able to use this account.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-black/10 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountForm({
  form,
  setField,
  onSave,
  onCancel,
  saving,
  error,
  isEditing,
  lockDefaultUncheck,
}: {
  form: AccountFormState
  setField: <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
  isEditing: boolean
  lockDefaultUncheck: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {isEditing ? 'Edit account' : 'New bank account'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Account label" required>
          <input
            className={INPUT}
            placeholder="NGN Main"
            value={form.account_label}
            onChange={(e) => setField('account_label', e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <select
            className={INPUT}
            value={form.currency}
            onChange={(e) => setField('currency', e.target.value)}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Bank name" required>
          <input
            className={INPUT}
            placeholder="First Bank Nigeria"
            value={form.bank_name}
            onChange={(e) => setField('bank_name', e.target.value)}
          />
        </Field>
        <Field label="Account name" required>
          <input
            className={INPUT}
            placeholder="Jane Smith"
            value={form.account_name}
            onChange={(e) => setField('account_name', e.target.value)}
          />
        </Field>
        <Field label="Account number" required>
          <input
            className={INPUT}
            placeholder="0123456789"
            value={form.account_number}
            onChange={(e) => setField('account_number', e.target.value)}
          />
        </Field>
        <Field label="Bank country">
          <input
            className={INPUT}
            placeholder="Nigeria"
            value={form.bank_country}
            onChange={(e) => setField('bank_country', e.target.value)}
          />
        </Field>
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

      <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_default}
          disabled={lockDefaultUncheck && form.is_default}
          onChange={(e) => setField('is_default', e.target.checked)}
          className="w-4 h-4 accent-brand"
        />
        Set as default account
        {lockDefaultUncheck && form.is_default && (
          <span className="text-xs text-gray-400">(only default — cannot uncheck)</span>
        )}
      </label>

      {error && (
        <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-black/10 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isEditing ? 'Save changes' : 'Add account'}
        </button>
      </div>
    </div>
  )
}
