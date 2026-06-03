import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const admin = createAdminClient()

  switch (event.event) {
    case 'charge.success': {
      const data = event.data
      const meta = data.metadata ?? {}
      const userId = meta.user_id
      if (!userId) break

      const planName = meta.plan_name as 'pro' | 'agency'
      const billingInterval = meta.billing_interval as 'monthly' | 'yearly'
      const billingCurrency = meta.billing_currency as 'NGN' | 'USD'
      const now = new Date()
      const periodEnd = new Date(now)
      if (billingInterval === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1)
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1)

      await admin.from('user_subscriptions').upsert(
        {
          user_id: userId,
          plan_name: planName,
          billing_currency: billingCurrency,
          billing_interval: billingInterval,
          status: 'active',
          paystack_customer_code: data.customer?.customer_code ?? null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      )
      await admin.from('profiles').update({ plan_name: planName }).eq('id', userId)
      break
    }

    case 'subscription.create': {
      const data = event.data
      const customerId = data.customer?.customer_code
      if (!customerId) break

      await admin
        .from('user_subscriptions')
        .update({
          paystack_subscription_code: data.subscription_code,
          paystack_plan_code: data.plan?.plan_code ?? null,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('paystack_customer_code', customerId)
      break
    }

    case 'subscription.disable': {
      const data = event.data
      const subCode = data.subscription_code
      if (!subCode) break

      await admin
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('paystack_subscription_code', subCode)
      break
    }

    case 'invoice.payment_failed': {
      const data = event.data
      const subCode = data.subscription?.subscription_code
      if (!subCode) break

      await admin
        .from('user_subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('paystack_subscription_code', subCode)

      // Email notification via existing send pattern would go here
      // Skipping to avoid pulling Resend into this handler
      break
    }

    case 'invoice.update': {
      const data = event.data
      const subCode = data.subscription?.subscription_code
      if (!subCode) break

      const periodStart = data.period_start ? new Date(data.period_start * 1000).toISOString() : null
      const periodEnd = data.period_end ? new Date(data.period_end * 1000).toISOString() : null

      await admin
        .from('user_subscriptions')
        .update({
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('paystack_subscription_code', subCode)
      break
    }
  }

  return NextResponse.json({ received: true })
}
