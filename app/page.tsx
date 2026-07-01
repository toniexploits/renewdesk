import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'RenewDesk — Renewal invoices for freelancers & agencies',
  description: 'Create professional renewal invoices, send via WhatsApp or email, and track every payment. Built for freelancers and agencies.',
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 tracking-tight">RenewDesk</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-5 sm:px-8">
        {/* Subtle background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(29,158,117,0.10) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-brand mb-6"
            style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
            Built for agencies &amp; freelancers
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
            Stop chasing payments.<br />
            <span className="text-brand">Start renewing clients.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10">
            RenewDesk makes it simple to create professional renewal invoices, send them via WhatsApp or email, and track every payment — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 bg-brand text-white text-base font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm"
            >
              Get started free
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto px-7 py-3.5 bg-white text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid rgba(0,0,0,0.1)' }}
            >
              View pricing
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">Free forever on Starter · No credit card required</p>
        </div>

        {/* Dashboard preview */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.12)' }}
          >
            {/* Fake browser chrome */}
            <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                renewdeskapp.com/dashboard
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="bg-surface p-5 sm:p-6">
              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total invoices', value: '24' },
                  { label: 'Outstanding', value: '₦180,000', sub: 'Pending + overdue' },
                  { label: 'Collected', value: '₦540,000', green: true },
                  { label: 'Overdue', value: '3' },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl px-4 py-3" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{card.label}</p>
                    <p className={`text-base font-bold mt-0.5 ${card.green ? 'text-brand' : 'text-gray-900'}`}>{card.value}</p>
                    {card.sub && <p className="text-[10px] text-gray-400">{card.sub}</p>}
                  </div>
                ))}
              </div>
              {/* Invoice rows */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <p className="text-sm font-semibold text-gray-900">Recent invoices</p>
                </div>
                {[
                  { client: 'Acme Corp', inv: 'INV-024', amount: '₦45,000', status: 'paid', color: 'bg-emerald-100 text-emerald-700' },
                  { client: 'Bright Media', inv: 'INV-023', amount: '₦30,000', status: 'overdue', color: 'bg-red-100 text-red-600' },
                  { client: 'Nova Studio', inv: 'INV-022', amount: '₦60,000', status: 'pending', color: 'bg-amber-100 text-amber-700' },
                ].map((row) => (
                  <div key={row.inv} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.client}</p>
                      <p className="text-xs text-gray-400">{row.inv}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-900">{row.amount}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${row.color}`}>{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8 bg-surface" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Everything you need to get paid
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From first invoice to final receipt, RenewDesk handles the entire renewal cycle.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                ),
                title: 'Invoices in minutes',
                desc: 'Create professional renewal invoices with line items, tax, due dates, and your bank details. Download as PDF instantly.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                ),
                title: 'WhatsApp & email sending',
                desc: 'Send invoices directly to clients via WhatsApp with a pre-filled message, or email a PDF attachment — in one click.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                ),
                title: 'Track every payment',
                desc: 'See who\'s paid, who\'s overdue, and who\'s partially paid. Record part payments and track the running balance.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2"/>
                    <line x1="8" y1="8" x2="16" y2="8"/>
                    <line x1="8" y1="13" x2="16" y2="13"/>
                  </svg>
                ),
                title: 'PDF receipts',
                desc: 'Automatically generate branded payment receipts. Send them to clients the moment payment is confirmed.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  </svg>
                ),
                title: 'Quotes & proposals',
                desc: 'Send quotes for client approval. Convert approved quotes into invoices without re-entering any details.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                title: 'Team collaboration',
                desc: 'Invite team members to manage your workspace. Everyone works from the same invoices, quotes, and client data.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6"
                style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              From invoice to payment in 3 steps
            </h2>
            <p className="text-gray-500 text-lg">No training needed. No complicated setup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create your invoice',
                desc: 'Add your client, services, renewal date, and payment terms. Your bank details are saved and pre-filled automatically.',
              },
              {
                step: '02',
                title: 'Send it instantly',
                desc: 'Share via WhatsApp with a message already written for you, or send a PDF by email — straight from the dashboard.',
              },
              {
                step: '03',
                title: 'Get paid & track it',
                desc: 'Mark invoices as paid, record part payments, and send professional receipts — all from one screen.',
              },
            ].map((item, i) => (
              <div key={item.step} className="flex flex-col items-start">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-brand/20 leading-none">{item.step}</span>
                  {i < 2 && (
                    <div className="hidden sm:block flex-1 h-px bg-gray-100" style={{ marginTop: 2 }} />
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8 bg-surface" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
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
                {[
                  '5 invoices per month',
                  '3 quotes per month',
                  '1 bank account',
                  'PDF download',
                  'WhatsApp sharing',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
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
                <span className="text-4xl font-black text-gray-900">₦5,000</span>
                <span className="text-sm text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">or ₦45,000/yr · save 3 months</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Unlimited invoices & quotes',
                  'Email sending with PDF attachment',
                  'Duplicate invoice',
                  'Up to 5 bank accounts',
                  'Remove RenewDesk branding',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
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
                <span className="text-4xl font-black text-gray-900">₦15,000</span>
                <span className="text-sm text-gray-400">/mo</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">or ₦135,000/yr · save 3 months</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Everything in Pro',
                  'Up to 10 bank accounts',
                  'Team members',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
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
            USD pricing also available · Secure payments via Paystack · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8 bg-white">
        <div
          className="max-w-3xl mx-auto rounded-2xl px-8 py-14 text-center"
          style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Ready to get paid on time?
          </h2>
          <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
            Join freelancers and agencies who use RenewDesk to manage client renewals professionally.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-brand text-base font-bold rounded-xl hover:bg-green-50 transition-colors"
          >
            Create your free account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <p className="text-green-200 text-xs mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-surface py-10 px-5 sm:px-8" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-base font-bold text-gray-900">RenewDesk</span>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="#features" className="hover:text-gray-800 transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-gray-800 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-gray-800 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-gray-800 transition-colors font-medium text-brand">Sign up</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} RenewDesk</p>
        </div>
      </footer>

    </div>
  )
}
