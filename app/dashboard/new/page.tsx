import { createClient } from '@/lib/supabase/server'
import NewRenewalForm from './NewRenewalForm'
import type { Profile } from '@/lib/types'

export default async function NewRenewalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">New renewal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a renewal invoice and send it to your client.</p>
      </div>
      <NewRenewalForm profile={profile as Profile | null} />
    </div>
  )
}
