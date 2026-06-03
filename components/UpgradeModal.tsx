'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

interface Props {
  isOpen: boolean
  onClose: () => void
  reason?: 'limit' | 'upgrade'
  onSuccess?: () => void
}

const FEATURES_PRO = [
  'Unlimited invoices & quotes',
  'Email sending with PDF attachment',
  'Receipt conversion',
  'Quote to invoice conversion',
  'Duplicate invoice',
  'Up to 5 bank accounts',
  'Remove RenewDesk branding',
]

const FEATURES_AGENCY = [
  'Everything in Pro',
  'Unlimited bank accounts',
  'Team members',
  'Custom templates',
  'Advanced analytics',
]

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand flex-shrink-0">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

declare global {
  interface Window {
    PaystackPop: { setup: (opts: object) => { openIframe: () => void } }
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById('paystack-inline')) { resolve(); return }
    const s = document.createElement('script')
    s.id = 'paystack-inline'
    s.src = 'https://js.paystack.co/v1/inline.js'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

export default function UpgradeModal({ isOpen, onClose, reason = 'upgrade', onSuccess }: Props) {
  const { billingCurrency, refresh } = useSubscription()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'agency' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState('')

  const currency = billingCurrency ?? 'NGN'
  const symbol = currency === 'NGN' ? '₦' : '$'

  const PRICES = {
    pro: { NGN: { monthly: 5000, yearly: 45000 }, USD: { monthly: 5, yearly: 50 } },
    agency: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 150 } },
  }

  function price(plan: 'pro' | 'agency') {
    return PRICES[plan][currency][interval].toLocaleString()
  }

  function savingsInfo(plan: 'pro' | 'agency') {
    const monthly = PRICES[plan][currency].monthly
    const saving = monthly * 12 - PRICES[plan][currency].yearly
    return { amount: saving.toLocaleString(), months: Math.round(saving / monthly) }
  }

  async function handleSelectPlan(plan: 'pro' | 'agency') {
    setSelectedPlan(plan)
    setProcessing(true)

    try {
      // 1. Get access_code from our API
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval, currency }),
      })
      if (!initRes.ok) throw new Error('Failed to initialize payment')
      const { access_code, reference, email, amountInSubunit } = await initRes.json()

      // 2. Load Paystack inline and open popup
      await loadPaystackScript()
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: amountInSubunit,
        ref: reference,
        access_code,
        onSuccess: async () => {
          // 3. Verify on our backend
          const verifyRes = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference }),
          })
          if (verifyRes.ok) {
            await refresh()
            setToast(`You're now on ${plan === 'pro' ? 'Pro' : 'Agency'}!`)
            setTimeout(() => setToast(''), 4000)
            onClose()
            onSuccess?.()
          }
        },
        onClose: () => {
          setProcessing(false)
          setSelectedPlan(null)
        },
      })
      handler.openIframe()
    } catch {
      setProcessing(false)
      setSelectedPlan(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Success toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-brand text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl w-full max-w-[560px] p-6 relative"
          style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {reason === 'limit' ? "You've reached your limit" : 'Upgrade your plan'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Unlimited invoices, quotes, email sending, receipts and more.
            </p>
          </div>

          {/* Interval toggle */}
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1 w-fit mb-5">
            {(['monthly', 'yearly'] as const).map(iv => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  interval === iv ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {iv === 'monthly' ? 'Monthly' : `Yearly — save up to ${currency === 'NGN' ? 3 : 2} months`}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pro */}
            <div
              className="rounded-xl p-4 flex flex-col"
              style={{ border: '2px solid #1D9E75', background: 'rgba(29,158,117,0.03)' }}
            >
              <div className="mb-3">
                <span className="inline-block bg-brand/10 text-brand text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2">Most popular</span>
                <p className="text-base font-bold text-gray-900">Pro</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-gray-900">{symbol}{price('pro')}</span>
                  <span className="text-xs text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {interval === 'yearly' && (
                  <p className="text-xs text-brand font-medium mt-0.5">
                    Save {symbol}{savingsInfo('pro').amount} · {savingsInfo('pro').months} months free
                  </p>
                )}
              </div>
              <ul className="space-y-1.5 mb-4 flex-1">
                {FEATURES_PRO.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan('pro')}
                disabled={processing}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {processing && selectedPlan === 'pro' ? 'Processing…' : 'Upgrade to Pro'}
              </button>
            </div>

            {/* Agency */}
            <div
              className="rounded-xl p-4 flex flex-col"
              style={{ border: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div className="mb-3">
                <p className="text-base font-bold text-gray-900 mt-6">Agency</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-gray-900">{symbol}{price('agency')}</span>
                  <span className="text-xs text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {interval === 'yearly' && (
                  <p className="text-xs text-brand font-medium mt-0.5">
                    Save {symbol}{savingsInfo('agency').amount} · {savingsInfo('agency').months} months free
                  </p>
                )}
              </div>
              <ul className="space-y-1.5 mb-4 flex-1">
                {FEATURES_AGENCY.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan('agency')}
                disabled={processing}
                className="w-full py-2 rounded-lg text-sm font-semibold text-gray-700 border border-black/15 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {processing && selectedPlan === 'agency' ? 'Processing…' : 'Upgrade to Agency'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Secure payment via Paystack. Cancel anytime.
          </p>
        </div>
      </div>
    </>
  )
}

// Inline Pro badge for locked features
export function ProBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
      title="Pro feature — click to upgrade"
    >
      <LockIcon />
      Pro
    </button>
  )
}
