'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/UpgradeModal'
import { navItems } from './navItems'

function isActive(href: string, exact: boolean, pathname: string) {
  if (exact) return pathname === href
  return pathname.startsWith(href)
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-white/10 text-white/50',
  pro: 'bg-brand/20 text-brand',
  agency: 'bg-purple-500/20 text-purple-300',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { plan, loading: subLoading } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar only — mobile nav is in Topbar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col z-20" style={{ background: '#1a1a18' }}>
        {/* Logo */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight tracking-tight">RenewDesk</p>
              <p className="text-white/40 text-[10px] mt-0.5">Client Renewal Manager</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-brand text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}

          <Link
            href="/pricing"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Pricing
          </Link>
        </nav>

        {/* Plan badge + upgrade */}
        {!subLoading && (
          <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="pt-3 flex items-center justify-between">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan] ?? PLAN_COLORS.starter}`}>
                {plan}
              </span>
              {plan === 'starter' && (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="text-xs font-medium text-brand hover:text-brand-dark transition-colors"
                >
                  Upgrade ↑
                </button>
              )}
            </div>
          </div>
        )}

        <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </aside>
    </>
  )
}
