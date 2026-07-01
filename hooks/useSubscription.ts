'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserSubscription } from '@/lib/types'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [],
  pro: [
    'email_sending',
    'receipt_conversion',
    'quote_to_invoice',
    'duplicate_invoice',
    'multiple_bank_accounts',
    'remove_branding',
    'client_directory',
  ],
  agency: [
    'email_sending',
    'receipt_conversion',
    'quote_to_invoice',
    'duplicate_invoice',
    'multiple_bank_accounts',
    'remove_branding',
    'team_members',
    'custom_templates',
    'advanced_analytics',
    'client_directory',
    'recurring_invoices',
  ],
}

interface SubscriptionState {
  plan: 'starter' | 'pro' | 'agency'
  subscription: UserSubscription | null
  loading: boolean
  billingCurrency: 'NGN' | 'USD'
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'starter',
    subscription: null,
    loading: true,
    billingCurrency: 'NGN',
  })

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('billing_currency').eq('id', user.id).single(),
    ])

    setState({
      plan: (sub?.plan_name ?? 'starter') as 'starter' | 'pro' | 'agency',
      subscription: sub as UserSubscription | null,
      loading: false,
      billingCurrency: (profile?.billing_currency ?? 'NGN') as 'NGN' | 'USD',
    })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function canUseFeature(featureKey: string): boolean {
    return PLAN_FEATURES[state.plan]?.includes(featureKey) ?? false
  }

  const removeBranding = state.plan === 'pro' || state.plan === 'agency'

  return { ...state, canUseFeature, refresh, removeBranding }
}
