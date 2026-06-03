import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTransaction } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

  const tx = await verifyTransaction(reference)
  if (tx.status !== 'success') {
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
  }

  const meta = tx.metadata ?? {}
  const planName = meta.plan_name as 'pro' | 'agency'
  const billingInterval = meta.billing_interval as 'monthly' | 'yearly'
  const billingCurrency = meta.billing_currency as 'NGN' | 'USD'

  const now = new Date()
  const periodEnd = new Date(now)
  if (billingInterval === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  const admin = createAdminClient()

  await admin.from('user_subscriptions').upsert(
    {
      user_id: user.id,
      plan_name: planName,
      billing_currency: billingCurrency,
      billing_interval: billingInterval,
      status: 'active',
      paystack_customer_code: tx.customer?.customer_code ?? null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' },
  )

  await admin.from('profiles').update({ plan_name: planName }).eq('id', user.id)

  return NextResponse.json({ success: true, plan: planName })
}
