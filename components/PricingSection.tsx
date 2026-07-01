'use client'

import { useState } from 'react'
import Link from 'next/link'

const PRICES = {
  pro:    { NGN: { monthly: 5000,  yearly: 45000  }, USD: { monthly: 5,  yearly: 45  } },
  agency: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 135 } },
}

const SYMBOL = { NGN: '₦', USD: '$' }

const FEATURES_STARTER = [
  '5 invoices per month',
  '3 quotes per month',
  '1 bank account',
  'PDF download',
  'WhatsApp sharing',
]

const FEATURES_PRO = [
  'Unlimited invoices & quotes',
  'Email sending with PDF attachment',
  'Duplicate invoice',
  'Up to 5 bank accounts',
  'Remove RenewDesk branding',
  'Client directory',
]

const FEATURES_AGENCY = [
  'Everything in Pro',
  'Up to 10 bank accounts',
  'Team members',
  'Recurring invoices',
  'Custom email sender name',
]

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function PricingSection() {
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN')
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')

  const sym = SYMBOL[currency]

  function fmt(plan: 'pro' | 'agency') {
    return PRICES[plan][currency][interval].toLocaleString()
  }

  function savings(plan: 'pro' | 'agency') {
    const saved = PRICES[plan][currency].monthly * 12 - PRICES[plan][currency].yearly
    return `${sym}${saved.toLocaleString()}`
  }

  return (
    <section className="py-24 px-5 sm:px-8 bg-surface" id="pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          {/* Currency */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1" style={{ border: '1px solid rgba(0,0,0,0.09)' }}>
            {(['NGN', 'USD'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currency === c ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c === 'NGN' ? '₦ NGN' : '$ USD'}
              </button>
            ))}
          </div>

          {/* Interval */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1" style={{ border: '1px solid rgba(0,0,0,0.09)' }}>
            {(['monthly', 'yearly'] as const).map(iv => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  interval === iv ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                {iv === 'yearly' && (
                  <span className="ml-1.5 text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">
                    Save 3 mo
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">

          {/* Starter */}
          <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Starter</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900">Free</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">Forever</p>
            <ul className="space-y-3 mb-8 flex-1">
              {FEATURES_STARTER.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-brand text-center hover:bg-brand/5 transition-colors"
              style={{ border: '1.5px solid rgba(29,158,117,0.4)' }}
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div
            className="bg-white rounded-2xl p-6 flex flex-col relative"
            style={{ border: '2px solid #1D9E75', boxShadow: '0 8px 32px rgba(29,158,117,0.12)' }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-brand text-white text-[11px] font-bold px-3 py-1 rounded-full">Most popular</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Pro</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900">{sym}{fmt('pro')}</span>
              <span className="text-sm text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            {interval === 'yearly' ? (
              <p className="text-xs text-brand font-medium mb-6">Save {savings('pro')} · 3 months free</p>
            ) : (
              <p className="text-xs text-gray-400 mb-6">or {sym}{PRICES.pro[currency].yearly.toLocaleString()}/yr · save 3 months</p>
            )}
            <ul className="space-y-3 mb-8 flex-1">
              {FEATURES_PRO.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-brand text-center hover:bg-brand-dark transition-colors"
            >
              Start with Pro
            </Link>
          </div>

          {/* Agency */}
          <div className="bg-white rounded-2xl p-6 flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Agency</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900">{sym}{fmt('agency')}</span>
              <span className="text-sm text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            {interval === 'yearly' ? (
              <p className="text-xs text-brand font-medium mb-6">Save {savings('agency')} · 3 months free</p>
            ) : (
              <p className="text-xs text-gray-400 mb-6">or {sym}{PRICES.agency[currency].yearly.toLocaleString()}/yr · save 3 months</p>
            )}
            <ul className="space-y-3 mb-8 flex-1">
              {FEATURES_AGENCY.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-700 text-center hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid rgba(0,0,0,0.12)' }}
            >
              Start with Agency
            </Link>
          </div>

        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Secure payments via Paystack · Cancel anytime
        </p>
      </div>
    </section>
  )
}
