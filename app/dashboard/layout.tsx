import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import { TeamProvider } from '@/contexts/TeamContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Detect if this user is a team member — find their owner
  const { data: membership } = await supabase
    .from('team_members')
    .select('owner_id')
    .eq('member_user_id', user.id)
    .maybeSingle()

  const ownerId = membership?.owner_id ?? null

  // Fetch owner's business name for the team banner
  let ownerBusinessName: string | null = null
  if (ownerId) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('business_name, full_name')
      .eq('id', ownerId)
      .single()
    ownerBusinessName = ownerProfile?.business_name || ownerProfile?.full_name || 'this workspace'
  }

  // Display name is always the logged-in user's own profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <TeamProvider memberId={user.id} ownerId={ownerId} ownerBusinessName={ownerBusinessName}>
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <Topbar displayName={displayName} initials={initials} />
        <main className="md:ml-56 pt-14 pb-20 md:pb-0 min-h-screen">
          {ownerId && (
            <div
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-sky-800 bg-sky-50"
              style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Viewing <strong className="font-semibold">{ownerBusinessName}&apos;s</strong> workspace
            </div>
          )}
          {children}
        </main>
      </div>
    </TeamProvider>
  )
}
