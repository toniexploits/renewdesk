import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/apiKeys'
import { apiSuccess, apiError, handleOptions } from '@/lib/apiMiddleware'

export const dynamic = 'force-dynamic'

const KEY_LIMITS: Record<string, number> = { starter: 0, pro: 5, agency: 10 }
const ALL_SCOPES = [
  'invoices:read','invoices:write',
  'quotes:read','quotes:write',
  'clients:read',
]

// GET /api/v1/keys — authenticated as dashboard user (cookie session), not API key
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return apiError('Unauthorized', 'UNAUTHORIZED', 401)

  const admin = createAdminClient()
  const { data, error: dbErr } = await admin.from('api_keys').select('id,name,prefix,last_four,scopes,created_at,last_used_at,expires_at,is_active')
    .eq('user_id', user.id).order('created_at', { ascending: false })
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  return apiSuccess(data ?? [])
}

// POST /api/v1/keys — create a new API key (dashboard user)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return apiError('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { name?: string; scopes?: string[]; expires_in_days?: number }
  try { body = await request.json() } catch { body = {} }

  const { name = 'API Key', scopes, expires_in_days } = body

  // Fetch plan
  const admin = createAdminClient()
  const { data: sub } = await admin.from('user_subscriptions').select('plan_name').eq('user_id', user.id).maybeSingle()
  const plan = sub?.plan_name ?? 'starter'

  if (plan === 'starter') {
    return apiError('API access requires a Pro or Agency plan', 'PLAN_REQUIRED', 403)
  }

  const maxKeys = KEY_LIMITS[plan] ?? 0
  const { count } = await admin.from('api_keys').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('is_active', true)

  if ((count ?? 0) >= maxKeys) {
    return apiError(`Your ${plan} plan allows a maximum of ${maxKeys} active API keys`, 'KEY_LIMIT_REACHED', 403)
  }

  const effectiveScopes = (scopes && scopes.every(s => ALL_SCOPES.includes(s)))
    ? scopes : ALL_SCOPES

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400_000).toISOString()
    : null

  const { fullKey, prefix, lastFour, hash } = await generateApiKey()

  const { data: keyRecord, error: dbErr } = await admin.from('api_keys').insert({
    user_id:   user.id,
    name:      name.slice(0, 100),
    key_hash:  hash,
    key_prefix: prefix,
    last_four: lastFour,
    scopes:    effectiveScopes,
    expires_at: expiresAt,
    is_active: true,
  }).select('id,name,prefix,last_four,scopes,created_at,expires_at').single()

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  // Return full key only once
  return apiSuccess({ ...keyRecord, key: fullKey, warning: 'Save this key — it will not be shown again.' })
}

export async function OPTIONS() { return handleOptions() }
