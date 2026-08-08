import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'
import { triggerWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

function quoteNumber() {
  return `QT-${Date.now().toString().slice(-6)}`
}

// GET /api/v1/quotes
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'quotes:read')
  if (scopeErr) return scopeErr

  const p = new URL(request.url).searchParams
  const status    = p.get('status')
  const page      = Math.max(1, parseInt(p.get('page')  ?? '1'))
  const limit     = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '20')))
  const from_date = p.get('from_date')
  const to_date   = p.get('to_date')

  const admin = createAdminClient()
  let q = admin.from('quotes').select('*', { count: 'exact' }).eq('user_id', auth.userId)
  if (status)    q = q.eq('status', status)
  if (from_date) q = q.gte('created_at', from_date)
  if (to_date)   q = q.lte('created_at', to_date)
  q = q.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, count, error: dbErr } = await q
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const res = apiSuccess(data ?? [], {
    page, limit, total: count ?? 0,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
  withRateLimitHeaders(res, auth)
  logRequest(auth, '/api/v1/quotes', 'GET', 200, Date.now() - start, request)
  return res
}

// POST /api/v1/quotes
export async function POST(request: NextRequest) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'quotes:write')
  if (scopeErr) return scopeErr

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Invalid JSON', 'INVALID_BODY', 400) }

  const {
    client_name, client_email, client_phone, contact_name,
    service_name, service_plan, validity_days = 30, notes,
    line_items, tax_rate, currency,
  } = body

  if (!client_name) return apiError('client_name is required', 'VALIDATION_ERROR', 400)
  if (!Array.isArray(line_items) || line_items.length === 0) {
    return apiError('line_items must be a non-empty array', 'VALIDATION_ERROR', 400)
  }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('tax_rate, currency').eq('id', auth.userId).single()

  const effectiveTaxRate = (typeof tax_rate === 'number' ? tax_rate : profile?.tax_rate) ?? 7.5
  const effectiveCurrency = (currency as string) || profile?.currency || 'NGN'

  const items = (line_items as Array<Record<string, unknown>>).map((item, i) => ({
    id:    `${Date.now()}-${i}`,
    desc:  String(item.description ?? item.desc ?? ''),
    qty:   Number(item.qty ?? 1),
    price: Number(item.unit_price ?? item.price ?? 0),
  }))

  const subtotal  = items.reduce((s, i) => s + i.qty * i.price, 0)
  const taxAmount = (subtotal * effectiveTaxRate) / 100
  const total     = subtotal + taxAmount

  const validUntil = new Date(Date.now() + Number(validity_days) * 86400_000).toISOString().slice(0, 10)

  const { data: quote, error: dbErr } = await admin.from('quotes').insert({
    user_id:      auth.userId,
    quote_number: quoteNumber(),
    client_name:  client_name as string,
    client_email: (client_email as string)  || null,
    client_phone: (client_phone as string)  || null,
    contact_name: (contact_name as string)  || null,
    service_name: (service_name as string)  || null,
    service_plan: (service_plan as string)  || null,
    valid_until:  validUntil,
    notes:        (notes as string)         || null,
    line_items:   items,
    subtotal,
    tax_rate:     effectiveTaxRate,
    tax_amount:   taxAmount,
    total,
    currency:     effectiveCurrency,
    status:       'draft',
  }).select().single()

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  triggerWebhook(auth.userId, 'quote.created', quote)

  const res = apiSuccess(quote)
  withRateLimitHeaders(res, auth)
  logRequest(auth, '/api/v1/quotes', 'POST', 201, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
