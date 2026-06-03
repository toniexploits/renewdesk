import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializeTransaction, createPlan } from '@/lib/paystack'

const AMOUNTS = {
  pro: { NGN: { monthly: 5000, yearly: 45000 }, USD: { monthly: 5, yearly: 45 } },
  agency: { NGN: { monthly: 15000, yearly: 135000 }, USD: { monthly: 15, yearly: 135 } },
} as const

const PAYSTACK_INTERVAL = { monthly: 'monthly', yearly: 'annually' } as const

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

  console.log('[paystack/initialize] body:', { plan, interval, currency })

  if (!['pro', 'agency'].includes(plan) || !['monthly', 'yearly'].includes(interval)) {
    return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
  }

  const amount = AMOUNTS[plan][currency][interval]
  const amountInSubunit = Math.round(amount * 100)
  console.log('[paystack/initialize] amount:', amount, '| in kobo/cents:', amountInSubunit)

  // Look up or create the Paystack plan code for recurring billing
  const admin = createAdminClient()
  const { data: planRow } = await admin
    .from('subscription_plans')
    .select('paystack_plan_codes')
    .eq('name', plan)
    .single()

  const storedCodes = (planRow?.paystack_plan_codes ?? {}) as Record<string, Record<string, string>>
  let planCode: string | undefined = storedCodes[currency]?.[interval]

  if (!planCode) {
    const planName = `RenewDesk ${plan.charAt(0).toUpperCase() + plan.slice(1)} ${currency} ${interval}`
    const created = await createPlan(planName, amount, PAYSTACK_INTERVAL[interval], currency)
    planCode = created.plan_code as string
    console.log('[paystack/initialize] created plan:', planCode)

    const updatedCodes = structuredClone(storedCodes)
    if (!updatedCodes[currency]) updatedCodes[currency] = {}
    updatedCodes[currency][interval] = planCode

    await admin
      .from('subscription_plans')
      .update({ paystack_plan_codes: updatedCodes })
      .eq('name', plan)
  }

  const email = user.email ?? ''
  console.log('[paystack/initialize] email:', email, '| planCode:', planCode)

  const data = await initializeTransaction(
    email,
    amount,
    currency,
    { user_id: user.id, plan_name: plan, billing_interval: interval, billing_currency: currency },
    planCode,
  )

  console.log('[paystack/initialize] Paystack response:', JSON.stringify(data))

  return NextResponse.json({ ...data, email, amountInSubunit })
}
