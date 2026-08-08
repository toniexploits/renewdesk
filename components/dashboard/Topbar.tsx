'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/UpgradeModal'
import { navItems } from './navItems'

interface TopbarProps {
  displayName: string
  initials: string
}

function isActive(href: string, exact: boolean, pathname: string) {
  if (exact) return pathname === href
  return pathname.startsWith(href)
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-white/10 text-white/50',
  pro: 'bg-brand/20 text-brand',
  agency: 'bg-purple-500/20 text-purple-300',
}

export default function Topbar({ displayName, initials }: TopbarProps) {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { plan, loading: subLoading } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 md:left-56 right-0 h-14 bg-white z-10 flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* Mobile left: hamburger + logo */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">RenewDesk</span>
          </div>
        </div>

        {/* Desktop spacer */}
        <div className="hidden md:block" />

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[140px] truncate">
              {displayName}
            </span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 transition-transform ${avatarOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {avatarOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl py-1.5 z-50"
              style={{ border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            >
              <Link
                href="/dashboard/settings"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
              </Link>
              <div className="my-1" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile slide-in drawer — visible on mobile only */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="relative flex flex-col w-64 h-full"
            style={{ background: '#1a1a18' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
              {/* Close button */}
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.href, item.exact, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
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
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Pricing
              </Link>
            </nav>

            {/* Plan badge + upgrade */}
            {!subLoading && (
              <div className="px-3 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="pt-3 flex items-center justify-between">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan] ?? PLAN_COLORS.starter}`}>
                    {plan}
                  </span>
                  {plan === 'starter' && (
                    <button
                      onClick={() => { setMenuOpen(false); setUpgradeOpen(true) }}
                      className="text-xs font-medium text-brand transition-colors"
                    >
                      Upgrade ↑
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  )
}
