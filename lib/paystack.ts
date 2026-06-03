import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!
const BASE = 'https://api.paystack.co'

async function paystackRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.status) throw new Error(json.message ?? 'Paystack error')
  return json.data
}

export async function initializeTransaction(
  email: string,
  amount: number,
  currency: 'NGN' | 'USD',
  metadata: Record<string, unknown>,
) {
  return paystackRequest('POST', '/transaction/initialize', {
    email,
    amount: Math.round(amount * 100),
    currency,
    metadata,
    channels: ['card'],
  })
}

export async function verifyTransaction(reference: string) {
  return paystackRequest('GET', `/transaction/verify/${reference}`)
}

export async function createSubscription(customerCode: string, planCode: string) {
  return paystackRequest('POST', '/subscription', {
    customer: customerCode,
    plan: planCode,
  })
}

export async function cancelSubscription(subscriptionCode: string, token: string) {
  return paystackRequest('POST', '/subscription/disable', {
    code: subscriptionCode,
    token,
  })
}

export async function createPlan(
  name: string,
  amount: number,
  interval: 'monthly' | 'annually',
  currency: 'NGN' | 'USD',
) {
  return paystackRequest('POST', '/plan', {
    name,
    amount: Math.round(amount * 100),
    interval,
    currency,
  })
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET!
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex')
  return hash === signature
}

// Plan amounts in kobo/cents (x100) — used for reference
export const PLAN_AMOUNTS = {
  pro: {
    NGN: { monthly: 500000, yearly: 4500000 },
    USD: { monthly: 500, yearly: 5000 },
  },
  agency: {
    NGN: { monthly: 1500000, yearly: 13500000 },
    USD: { monthly: 1500, yearly: 15000 },
  },
} as const
