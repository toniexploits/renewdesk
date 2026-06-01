import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminTeamClient from '@/components/admin/AdminTeamClient'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminTeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isSuperAdmin = myProfile?.role === 'super_admin'

  // Get current admin team
  const admin = createAdminClient()
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id, full_name, business_name, role, created_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  // Enrich with emails
  const team = await Promise.all(
    (adminProfiles ?? []).map(async (p: { id: string; full_name: string | null; business_name: string | null; role: string; created_at: string }) => {
      try {
        const { data: { user: au } } = await admin.auth.admin.getUserById(p.id)
        return { ...p, email: au?.email ?? '' }
      } catch {
        return { ...p, email: '' }
      }
    })
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Team Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isSuperAdmin
          ? 'Grant or revoke admin access for existing RenewDesk users.'
          : 'View the current admin team. Only super admins can make changes.'}
      </p>
      <AdminTeamClient
        team={team}
        isSuperAdmin={isSuperAdmin}
        currentUserId={user.id}
      />
    </div>
  )
}
