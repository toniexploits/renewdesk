'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RecurringInvoice } from '@/lib/types'
import { useTeam } from '@/contexts/TeamContext'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/UpgradeModal'

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function RecurringPage() {
  const { effectiveUserId } = useTeam()
  const { canUseFeature, loading: subLoading } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [schedules, setSchedules] = useState<RecurringInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!effectiveUserId) return
    const uid = effectiveUserId
    const supabase = createClient()
    let active = true

    supabase
      .from('recurring_invoices')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then((res: { data: RecurringInvoice[] | null }) => {
        if (active) {
          setSchedules(res.data ?? [])
          setLoading(false)
        }
      })

    return () => { active = false }
  }, [effectiveUserId])

  async function setStatus(id: string, status: 'active' | 'paused' | 'cancelled') {
    setUpdating(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('recurring_invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    }
    setUpdating(null)
  }

  if (!subLoading && !canUseFeature('recurring_invoices')) {
    return (
      <>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Recurring Invoices</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Auto-generate invoices on a monthly, quarterly, or yearly schedule. Available on the Agency plan.
          </p>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            Upgrade to unlock
          </button>
        </div>
        <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </>
    )
  }

  const active = schedules.filter(s => s.status === 'active')
  const inactive = schedules.filter(s => s.status !== 'active')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Recurring Invoices</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Invoices are auto-generated daily at 6am UTC. Set up a schedule from the action menu on any invoice.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No recurring schedules yet</p>
          <p className="text-sm text-gray-400">Open any invoice → action menu → &quot;Make recurring&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Active ({active.length})</h2>
              <ScheduleTable schedules={active} updating={updating} onSetStatus={setStatus} />
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Inactive ({inactive.length})</h2>
              <ScheduleTable schedules={inactive} updating={updating} onSetStatus={setStatus} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleTable({
  schedules,
  updating,
  onSetStatus,
}: {
  schedules: RecurringInvoice[]
  updating: string | null
  onSetStatus: (id: string, status: 'active' | 'paused' | 'cancelled') => void
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FAFAF9' }}>
            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Client</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Frequency</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Next invoice</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 hidden md:table-cell">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {schedules.map(s => (
            <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900">{s.client_name}</p>
                {s.service_name && <p className="text-xs text-gray-400 mt-0.5">{s.service_name}</p>}
              </td>
              <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                {FREQ_LABEL[s.frequency] ?? s.frequency}
              </td>
              <td className="px-5 py-3.5 text-gray-700 font-medium">
                {s.status === 'cancelled' ? '—' : fmtDate(s.next_due_date)}
              </td>
              <td className="px-5 py-3.5 hidden md:table-cell">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[s.status] ?? ''}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-2">
                  {updating === s.id ? (
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  ) : s.status === 'active' ? (
                    <button
                      onClick={() => onSetStatus(s.id, 'paused')}
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      Pause
                    </button>
                  ) : s.status === 'paused' ? (
                    <button
                      onClick={() => onSetStatus(s.id, 'active')}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Resume
                    </button>
                  ) : null}
                  {s.status !== 'cancelled' && (
                    <button
                      onClick={() => onSetStatus(s.id, 'cancelled')}
                      className="text-xs font-medium text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
