import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: 'RenewDesk Admin' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const displayName = profile.full_name || user.email?.split('@')[0] || 'Admin'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-surface font-sans">
      <AdminSidebar displayName={displayName} role={profile.role} initials={initials} />
      <main className="md:ml-64 pt-14 min-h-screen">
        {children}
      </main>
    </div>
  )
}
