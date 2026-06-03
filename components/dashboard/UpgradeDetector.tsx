'use client'

import { useEffect, useState } from 'react'
import UpgradeModal from '@/components/UpgradeModal'

export default function UpgradeDetector() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [])

  return <UpgradeModal isOpen={open} onClose={() => setOpen(false)} reason="upgrade" />
}
