import { createClient } from '@/lib/supabase/server'
import NewRenewalForm from './NewRenewalForm'
import type { Profile, Invoice, BankAccount } from '@/lib/types'
import { canCreateInvoice } from '@/lib/usageLimits'
import { getEffectiveUserId } from '@/lib/team'

export default async function NewRenewalPage({
  searchParams,
}: {
  searchParams: { edit?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const effectiveUserId = await getEffectiveUserId(user!.id)

  const [{ data: profile }, { data: invoice }, { data: bankAccounts }, usage] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', effectiveUserId).single(),
    searchParams.edit
      ? supabase.from('invoices').select('*').eq('id', searchParams.edit).eq('user_id', effectiveUserId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    canCreateInvoice(effectiveUserId),
  ])

  const isEditing = !!invoice

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit renewal' : 'New renewal'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEditing
            ? 'Update the invoice details and save changes.'
            : 'Create a renewal invoice and send it to your client.'}
        </p>
      </div>
      <NewRenewalForm
        profile={profile as Profile | null}
        invoice={invoice as Invoice | null}
        bankAccounts={(bankAccounts as BankAccount[] | null) ?? []}
        usage={usage}
      />
    </div>
  )
}
