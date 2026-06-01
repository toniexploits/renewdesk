import { createAdminClient } from '@/lib/supabase/admin'
import AdminAuditClient from '@/components/admin/AdminAuditClient'

export default async function AdminAuditPage() {
  const admin = createAdminClient()

  const { data: logs } = await admin
    .from('admin_audit_log')
    .select('id, admin_user_id, action, target_user_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, business_name')

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]))

  const rows = (logs ?? []).map((log: {
    id: string; admin_user_id: string; action: string; target_user_id: string | null; metadata: Record<string, unknown>; created_at: string
  }) => {
    const adminP  = profileMap.get(log.admin_user_id)
    const targetP = log.target_user_id ? profileMap.get(log.target_user_id) : null
    return {
      id:         log.id,
      admin_name: adminP?.full_name || adminP?.business_name || log.admin_user_id.slice(0, 8),
      action:     log.action,
      target:     targetP ? (targetP.full_name || targetP.business_name || log.target_user_id?.slice(0, 8) || '—') : '—',
      metadata:   log.metadata,
      created_at: log.created_at,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-6">All admin actions are logged here for accountability.</p>
      <AdminAuditClient logs={rows} />
    </div>
  )
}
