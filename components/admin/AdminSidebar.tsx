'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface Props {
  displayName: string
  role: string
  initials: string
}

const navItems = [
  {
    label: 'Overview', href: '/rd-admin', exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    label: 'Users', href: '/rd-admin/users', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Invoices', href: '/rd-admin/invoices', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Quotes', href: '/rd-admin/quotes', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Analytics', href: '/rd-admin/analytics', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    label: 'Audit Log', href: '/rd-admin/audit', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: 'Team', href: '/rd-admin/team', exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
        <line x1="12" y1="14" x2="12" y2="17"/><line x1="10" y1="16" x2="14" y2="16"/>
      </svg>
    ),
  },
]

function isActive(href: string, exact: boolean, pathname: string) {
  if (exact) return pathname === href
  return pathname.startsWith(href)
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export default function AdminSidebar({ displayName, role, initials }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0f0f0e' }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight tracking-tight">RenewDesk</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'text-white font-medium'
                  : 'hover:text-white'
              }`}
              style={{
                background: active ? '#1D9E75' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: back to app */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors mt-3"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to app
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Fixed topbar */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center px-4 z-30"
        style={{ background: '#0f0f0e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Hamburger on mobile */}
        <button
          className="md:hidden mr-3 text-white/60 hover:text-white transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Brand on mobile / spacer on desktop */}
        <span className="md:hidden text-white text-sm font-semibold">RenewDesk Admin</span>
        <div className="hidden md:block w-64 flex-shrink-0" /> {/* spacer equal to sidebar */}

        {/* User info */}
        <div className="ml-auto flex items-center gap-3">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={
              role === 'super_admin'
                ? { background: '#E1F5EE', color: '#085041' }
                : { background: '#EFF6FF', color: '#1D4ED8' }
            }
          >
            {ROLE_LABEL[role] ?? role}
          </span>
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="hidden sm:block text-white/70 text-sm">{displayName}</span>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-20">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-64 h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
