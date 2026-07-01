'use client'

import { useRouter } from 'next/navigation'
import UpgradeModal from '@/components/UpgradeModal'

export default function UpgradePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-surface">
      <UpgradeModal
        isOpen={true}
        onClose={() => router.push('/dashboard')}
      />
    </div>
  )
}
