import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/apiKeys'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Rate limits per plan ────────────────────────────────────────────────────
const RATE_LIMITS: Record<string, number> = {
  starter: 60,
  pro:     300,
  agency:  1000,
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface AuthContext {
  userId:             string
  scopes:             string[]
  keyId:              string
  plan:               string
  rateLimit:          number
  rateLimitRemaining: number
  rateLimitReset:     number
}

// ── CORS helpers ─────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── Standard response builders ───────────────────────────────────────────────
export function apiError(
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code, ...extra },
    { status, headers: CORS },
  )
}

export function apiSuccess(
  data: unknown,
  meta?: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { headers: { ...CORS, ...(extraHeaders ?? {}) } },
  )
}

// ── Main auth + rate-limit middleware ────────────────────────────────────────
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<{ auth: AuthContext; error?: never } | { auth?: never; error: NextResponse }> {
  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return { error: apiError('Missing API key', 'UNAUTHORIZED', 401) }
  }

  const providedKey = authHeader.slice(7).trim()
  const result      = await verifyApiKey(providedKey)

  if (!result.valid || !result.userId || !result.keyId) {
    return { error: apiError('Invalid or expired API key', 'UNAUTHORIZED', 401) }
  }

  const plan  = result.plan ?? 'starter'
  const limit = RATE_LIMITS[plan] ?? 60

  // Count requests in the last 60 seconds for this key
  const admin  = createAdminClient()
  const since  = new Date(Date.now() - 60_000).toISOString()
  const { count } = await admin
    .from('api_requests_log')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', result.keyId)
    .gte('created_at', since)

  const used      = count ?? 0
  const remaining = Math.max(0, limit - used - 1) // -1 for this request
  const resetAt   = Math.floor((Date.now() + 60_000) / 1000)

  if (used >= limit) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Rate limit exceeded', code: 'RATE_LIMITED', retry_after: 60 },
        {
          status: 429,
          headers: {
            ...CORS,
            'X-RateLimit-Limit':     String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':     String(resetAt),
            'Retry-After':           '60',
          },
        },
      ),
    }
  }

  return {
    auth: {
      userId:             result.userId,
      scopes:             result.scopes ?? [],
      keyId:              result.keyId,
      plan,
      rateLimit:          limit,
      rateLimitRemaining: remaining,
      rateLimitReset:     resetAt,
    },
  }
}

// ── Scope check ───────────────────────────────────────────────────────────────
export function checkScope(scopes: string[], required: string): NextResponse | null {
  if (!scopes.includes(required)) {
    return apiError('Insufficient permissions', 'FORBIDDEN', 403, { required_scope: required })
  }
  return null
}

// ── Rate-limit headers helper ─────────────────────────────────────────────────
export function withRateLimitHeaders(response: NextResponse, auth: AuthContext): NextResponse {
  response.headers.set('X-RateLimit-Limit',     String(auth.rateLimit))
  response.headers.set('X-RateLimit-Remaining', String(auth.rateLimitRemaining))
  response.headers.set('X-RateLimit-Reset',     String(auth.rateLimitReset))
  return response
}

// ── Request logger (fire and forget) ─────────────────────────────────────────
export function logRequest(
  auth:           AuthContext,
  endpoint:       string,
  method:         string,
  statusCode:     number,
  responseTimeMs: number,
  request:        NextRequest,
): void {
  const admin     = createAdminClient()
  const ip        = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               ?? request.headers.get('x-real-ip') ?? ''
  const userAgent = request.headers.get('user-agent') ?? ''

  admin.from('api_requests_log').insert({
    api_key_id:       auth.keyId,
    user_id:          auth.userId,
    endpoint,
    method,
    status_code:      statusCode,
    response_time_ms: responseTimeMs,
    ip_address:       ip,
    user_agent:       userAgent,
  }).then(() => {})
}
