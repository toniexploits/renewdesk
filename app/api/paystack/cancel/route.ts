import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscriptionCode } = await req.json()
  if (!subscriptionCode) return NextResponse.json({ error: 'Missing subscriptionCode' }, { status: 400 })

  // Call Paystack to disable the subscription
  const res = await fetch('https://api.paystack.co/subscription/disable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: subscriptionCode, token: '' }),
  })
  const json = await res.json()
  if (!json.status) {
    return NextResponse.json({ error: json.message }, { status: 400 })
  }

  const admin = createAdminClient()
  await admin
    .from('user_subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
