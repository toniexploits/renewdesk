import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'

export const dynamic = 'force-dynamic'

// GET /api/v1/clients
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'clients:read')
  if (scopeErr) return scopeErr

  const p = new URL(request.url).searchParams
  const page  = Math.max(1, parseInt(p.get('page')  ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '20')))
  const q     = p.get('q') // search by name

  const admin = createAdminClient()
  let query = admin.from('clients').select('*', { count: 'exact' }).eq('user_id', auth.userId)
  if (q) query = query.ilike('name', `%${q}%`)
  query = query.order('name', { ascending: true }).range((page - 1) * limit, page * limit - 1)

  const { data, count, error: dbErr } = await query
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const res = apiSuccess(data ?? [], {
    page, limit, total: count ?? 0,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
  withRateLimitHeaders(res, auth)
  logRequest(auth, '/api/v1/clients', 'GET', 200, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
