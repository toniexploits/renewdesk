import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'

export const dynamic = 'force-dynamic'

// GET /api/v1/quotes/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'quotes:read')
  if (scopeErr) return scopeErr

  const admin = createAdminClient()
  const { data, error: dbErr } = await admin.from('quotes').select('*')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()

  if (dbErr)  return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  if (!data)  return apiError('Quote not found', 'NOT_FOUND', 404)

  const res = apiSuccess(data)
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/quotes/${params.id}`, 'GET', 200, Date.now() - start, request)
  return res
}

// PATCH /api/v1/quotes/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'quotes:write')
  if (scopeErr) return scopeErr

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Invalid JSON', 'INVALID_BODY', 400) }

  const admin = createAdminClient()
  const { data: existing, error: fetchErr } = await admin.from('quotes').select('*')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()
  if (fetchErr)  return apiError(fetchErr.message, 'DATABASE_ERROR', 500)
  if (!existing) return apiError('Quote not found', 'NOT_FOUND', 404)

  const allowed = ['status','notes','line_items','client_name','client_email',
                   'client_phone','service_name','service_plan','validity_days','currency']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body && key !== 'validity_days') updates[key] = body[key]
  }

  // validity_days → recalculate valid_until
  if ('validity_days' in body) {
    const days = Number(body.validity_days)
    updates.valid_until = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10)
  }

  // Recalculate totals if line_items updated
  if (updates.line_items && Array.isArray(updates.line_items)) {
    const items = (updates.line_items as Array<Record<string,unknown>>).map((i, idx) => ({
      id:    i.id ?? `${Date.now()}-${idx}`,
      desc:  String(i.desc ?? i.description ?? ''),
      qty:   Number(i.qty ?? 1),
      price: Number(i.price ?? i.unit_price ?? 0),
    }))
    updates.line_items = items
    const subtotal  = items.reduce((s, i) => s + i.qty * i.price, 0)
    const taxRate   = (existing as Record<string,number>).tax_rate ?? 7.5
    updates.subtotal   = subtotal
    updates.tax_amount = (subtotal * taxRate) / 100
    updates.total      = subtotal + (subtotal * taxRate) / 100
  }

  const { data: updated, error: dbErr } = await admin.from('quotes')
    .update(updates).eq('id', params.id).select().single()
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const res = apiSuccess(updated)
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/quotes/${params.id}`, 'PATCH', 200, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
