import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, handleOptions } from '@/lib/apiMiddleware'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const ALL_EVENTS = [
  'invoice.created','invoice.updated','invoice.paid',
  'quote.created','quote.converted',
]

// GET /api/v1/webhooks — list webhooks (dashboard user)
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return apiError('Unauthorized', 'UNAUTHORIZED', 401)

  const admin = createAdminClient()
  const { data, error: dbErr } = await admin.from('webhooks')
    .select('id,url,events,is_active,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  return apiSuccess(data ?? [])
}

// POST /api/v1/webhooks — register a webhook (dashboard user)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return apiError('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { url?: string; events?: string[] }
  try { body = await request.json() } catch { body = {} }

  const { url, events } = body

  if (!url || !url.startsWith('https://')) {
    return apiError('url must be a valid HTTPS URL', 'VALIDATION_ERROR', 400)
  }
  if (!Array.isArray(events) || events.length === 0) {
    return apiError('events must be a non-empty array', 'VALIDATION_ERROR', 400)
  }
  const invalidEvents = events.filter(e => !ALL_EVENTS.includes(e))
  if (invalidEvents.length > 0) {
    return apiError(`Unknown events: ${invalidEvents.join(', ')}. Valid: ${ALL_EVENTS.join(', ')}`, 'VALIDATION_ERROR', 400)
  }

  // Check plan allows webhooks
  const admin = createAdminClient()
  const { data: sub } = await admin.from('user_subscriptions').select('plan_name').eq('user_id', user.id).maybeSingle()
  const plan = sub?.plan_name ?? 'starter'
  if (plan === 'starter') {
    return apiError('Webhooks require a Pro or Agency plan', 'PLAN_REQUIRED', 403)
  }

  // Max 5 active webhooks per user
  const { count } = await admin.from('webhooks').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('is_active', true)
  if ((count ?? 0) >= 5) {
    return apiError('Maximum of 5 active webhooks per account', 'WEBHOOK_LIMIT', 403)
  }

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`

  const { data: webhook, error: dbErr } = await admin.from('webhooks').insert({
    user_id:   user.id,
    url,
    events,
    secret,
    is_active: true,
  }).select('id,url,events,is_active,created_at').single()

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  return apiSuccess({ ...webhook, secret, warning: 'Save this secret — it will not be shown again.' })
}

export async function OPTIONS() { return handleOptions() }
