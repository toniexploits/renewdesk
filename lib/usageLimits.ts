import { createClient } from '@/lib/supabase/server'

const PLAN_LIMITS = {
  starter: { invoices: 5, quotes: 3 },
  pro: { invoices: null, quotes: null },
  agency: { invoices: null, quotes: null },
}

const WARNING_THRESHOLD = { invoices: 4, quotes: 2 }

export interface UsageResult {
  allowed: boolean
  current: number
  limit: number | null
  warningThreshold: boolean
}

function currentBillingMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getUserPlan(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan_name, billing_currency, billing_interval, status, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .single()
  return data
}

export async function getUserUsage(userId: string) {
  const supabase = createClient()
  const month = currentBillingMonth()
  const { data } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('billing_month', month)
    .single()
  return data
}

export async function canCreateInvoice(userId: string): Promise<UsageResult> {
  const plan = await getUserPlan(userId)
  const planName = (plan?.plan_name ?? 'starter') as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[planName]?.invoices ?? null

  if (limit === null) return { allowed: true, current: 0, limit: null, warningThreshold: false }

  const usage = await getUserUsage(userId)
  const current = usage?.invoices_created ?? 0

  return {
    allowed: current < limit,
    current,
    limit,
    warningThreshold: current >= WARNING_THRESHOLD.invoices,
  }
}

export async function canCreateQuote(userId: string): Promise<UsageResult> {
  const plan = await getUserPlan(userId)
  const planName = (plan?.plan_name ?? 'starter') as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[planName]?.quotes ?? null

  if (limit === null) return { allowed: true, current: 0, limit: null, warningThreshold: false }

  const usage = await getUserUsage(userId)
  const current = usage?.quotes_created ?? 0

  return {
    allowed: current < limit,
    current,
    limit,
    warningThreshold: current >= WARNING_THRESHOLD.quotes,
  }
}

export async function incrementInvoiceCount(userId: string) {
  const supabase = createClient()
  const month = currentBillingMonth()
  await supabase.rpc('increment_invoice_count', { p_user_id: userId, p_month: month })
}

export async function incrementQuoteCount(userId: string) {
  const supabase = createClient()
  const month = currentBillingMonth()
  await supabase.rpc('increment_quote_count', { p_user_id: userId, p_month: month })
}

export async function resetMonthlyUsage(userId: string) {
  const supabase = createClient()
  const month = currentBillingMonth()
  await supabase
    .from('usage_tracking')
    .upsert({
      user_id: userId,
      billing_month: month,
      invoices_created: 0,
      quotes_created: 0,
      reset_at: new Date().toISOString(),
    }, { onConflict: 'user_id,billing_month' })
}
