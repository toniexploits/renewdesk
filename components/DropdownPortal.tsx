'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownPortalProps {
  isOpen: boolean
  anchorRef: React.RefObject<HTMLElement>
  onClose: () => void
  children: React.ReactNode
}

export default function DropdownPortal({
  isOpen,
  anchorRef,
  onClose,
  children,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<React.CSSProperties>({})

  // Keep a stable ref to onClose so scroll/resize handlers never go stale
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // Mount guard — createPortal needs document.body
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return

    // Compute position once when the dropdown opens
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < 250

    setPos(
      openUpward
        ? {
            // Align bottom of dropdown to top of button (with 4px gap)
            bottom: window.innerHeight - rect.top + 4,
            right: window.innerWidth - rect.right,
          }
        : {
            // Align top of dropdown to bottom of button (with 4px gap)
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
          }
    )

    // Close on any scroll or resize — cleaner than repositioning mid-scroll
    function close() { onCloseRef.current() }
    window.addEventListener('scroll', close, { capture: true, passive: true })
    window.addEventListener('resize', close)

    return () => {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [isOpen, anchorRef])

  if (!mounted || !isOpen) return null

  return createPortal(
    <>
      <style>{`
        @keyframes portal-dropdown-in {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      {/* Full-screen backdrop — catches outside clicks */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Dropdown, always on top of everything */}
      <div
        style={{
          position: 'fixed',
          ...pos,
          zIndex: 9999,
          minWidth: 200,
          animation: 'portal-dropdown-in 0.12s ease-out',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
