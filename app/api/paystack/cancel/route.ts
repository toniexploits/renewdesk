import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Consume body to avoid Next.js warnings (subscriptionCode sent by client but we fetch from DB)
  await req.json().catch(() => null)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('paystack_subscription_code, paystack_email_token')
    .eq('user_id', user.id)
    .single()

  if (!sub?.paystack_subscription_code) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  if (!sub.paystack_email_token) {
    return NextResponse.json(
      { error: 'Subscription token not available — please contact support' },
      { status: 400 },
    )
  }

  const res = await fetch('https://api.paystack.co/subscription/disable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: sub.paystack_subscription_code,
      token: sub.paystack_email_token,
    }),
  })

  const json = await res.json()
  if (!json.status) {
    return NextResponse.json({ error: json.message }, { status: 400 })
  }

  await admin
    .from('user_subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
