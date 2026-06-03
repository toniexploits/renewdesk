import { createClient } from '@/lib/supabase/server'
import NewQuoteForm from './NewQuoteForm'
import type { Profile, Quote, BankAccount } from '@/lib/types'
import { canCreateQuote } from '@/lib/usageLimits'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: { edit?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: quote }, { data: bankAccounts }, usage] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    searchParams.edit
      ? supabase
          .from('quotes')
          .select('*')
          .eq('id', searchParams.edit)
          .eq('user_id', user!.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user!.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    canCreateQuote(user!.id),
  ])

  const isEditing = !!quote

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit quote' : 'New quote'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEditing
            ? 'Update the quote details and save changes.'
            : 'Create a quote and send it to your client for approval.'}
        </p>
      </div>
      <NewQuoteForm
        profile={profile as Profile | null}
        quote={quote as Quote | null}
        bankAccounts={(bankAccounts as BankAccount[] | null) ?? []}
        usage={usage}
      />
    </div>
  )
}
