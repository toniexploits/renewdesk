'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For freelancers just getting started',
    prices: { NGN: { monthly: 0, yearly: 0 }, USD: { monthly: 0, yearly: 0 } },
    invoiceLimit: '5 invoices/month',
    quoteLimit: '3 quotes/month',
    features: [
      { label: '5 invoices per month', included: true },
      { label: '3 quotes per month', included: true },
      { label: '1 bank account', included: true },
      { label: 'PDF download', included: true },
      { label: 'WhatsApp sharing', included: true },
      { label: 'Email sending', included: false },
      { label: 'Receipt conversion', included: false },
      { label: 'Quote to invoice', included: false },
      { label: 'Duplicate invoice', included: false },
      { label: 'Remove branding', included: false },
      { label: 'Team members', included: false },
    ],
    cta: 'Get started free',
    href: '/signup',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For active freelancers & solo agencies',
    prices: { NGN: { monthly: 5000, yearly: 45000 }, USD: { monthly: 5, yearly: 50 } },
    invoiceLimit: 'Unlimited',
    quoteLimit: 'Unlimited',
    features: [
      { label: 'Unlimited invoices', included: true },
      { label: 'Unlimited quotes', included: true },
      { label: 'Up to 5 bank accounts', included: true },
      { label: 'PDF download', included: true },
      { label: 'WhatsApp sharing', included: true },
      { label: 'Email sending', included: true },
      { label: 'Receipt conversion', included: true },
      { label: 'Quote to invoice', included: true },
      { label: 'Duplicate invoice', included: true },
      { label: 'Remove branding', included: true },
      { label: 'Team members', included: false },
    ],
    cta: 'Get started',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    key: 'agency',
    name: 'Agency',
    tagline: 'For growing teams & agencies',
    prices: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 150 } },
    invoiceLimit: 'Unlimited',
    quoteLimit: 'Unlimited',
    features: [
      { label: 'Unlimited invoices', included: true },
      { label: 'Unlimited quotes', included: true },
      { label: 'Unlimited bank accounts', included: true },
      { label: 'PDF download', included: true },
      { label: 'WhatsApp sharing', included: true },
      { label: 'Email sending', included: true },
      { label: 'Receipt conversion', included: true },
      { label: 'Quote to invoice', included: true },
      { label: 'Duplicate invoice', included: true },
      { label: 'Remove branding', included: true },
      { label: 'Team members', included: true },
    ],
    cta: 'Get started',
    href: '/signup?plan=agency',
    highlight: false,
  },
]

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand flex-shrink-0">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-shrink-0">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN')
  const symbol = currency === 'NGN' ? '₦' : '$'

  function formatPrice(plan: typeof PLANS[0]) {
    const p = plan.prices[currency][billingInterval]
    if (p === 0) return 'Free'
    return `${symbol}${p.toLocaleString()}`
  }

  function yearlySavings(plan: typeof PLANS[0]) {
    const monthly12 = plan.prices[currency].monthly * 12
    const yearly = plan.prices[currency].yearly
    return monthly12 - yearly
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Nav */}
      <header className="bg-white border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">RenewDesk</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sign in</Link>
            <Link href="/signup" className="text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-3.5 py-2 rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-base">Start free. Upgrade when you need more.</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {/* Billing interval */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            {(['monthly', 'yearly'] as const).map(iv => (
              <button
                key={iv}
                onClick={() => setBillingInterval(iv)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billingInterval === iv ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {iv === 'monthly' ? 'Monthly' : 'Yearly — save 2 months'}
              </button>
            ))}
          </div>

          {/* Currency */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            {(['NGN', 'USD'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currency === c ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c === 'NGN' ? '₦ NGN' : '$ USD'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const savings = yearlySavings(plan)
            return (
              <div
                key={plan.key}
                className={`bg-white rounded-2xl p-6 flex flex-col relative ${
                  plan.highlight ? 'ring-2 ring-brand' : ''
                }`}
                style={{ border: plan.highlight ? 'none' : '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-base font-bold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.tagline}</p>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{formatPrice(plan)}</span>
                      {plan.prices[currency].monthly > 0 && (
                        <span className="text-sm text-gray-400">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                      )}
                    </div>
                    {billingInterval === 'yearly' && savings > 0 && (
                      <span className="inline-block mt-1.5 text-xs font-medium text-brand bg-brand/8 px-2 py-0.5 rounded-full">
                        Save {symbol}{savings.toLocaleString()}/year
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-center gap-2.5 text-sm text-gray-600">
                      {f.included ? <CheckIcon /> : <CrossIcon />}
                      <span className={f.included ? '' : 'text-gray-400'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-brand text-white hover:bg-brand-dark'
                      : plan.key === 'starter'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-black/15 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-10">
          All plans include a 14-day money-back guarantee. No questions asked. · Powered by Paystack.
        </p>
      </main>
    </div>
  )
}
