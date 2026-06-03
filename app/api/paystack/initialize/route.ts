import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeTransaction } from '@/lib/paystack'

const AMOUNTS = {
  pro: { NGN: { monthly: 5000, yearly: 45000 }, USD: { monthly: 5, yearly: 50 } },
  agency: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 150 } },
} as const

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('billing_currency')
    .eq('id', user.id)
    .single()

  const body = await req.json()
  const plan = body.plan as 'pro' | 'agency'
  const interval = body.interval as 'monthly' | 'yearly'
  const currency = (body.currency ?? profile?.billing_currency ?? 'NGN') as 'NGN' | 'USD'

  if (!['pro', 'agency'].includes(plan) || !['monthly', 'yearly'].includes(interval)) {
    return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
  }

  const amount = AMOUNTS[plan][currency][interval]

  const data = await initializeTransaction(
    user.email!,
    amount,
    currency,
    {
      user_id: user.id,
      plan_name: plan,
      billing_interval: interval,
      billing_currency: currency,
    },
  )

  return NextResponse.json(data)
}
