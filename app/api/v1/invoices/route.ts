import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'
import { triggerWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

function invNumber() {
  return `INV-${Date.now().toString().slice(-6)}`
}

// GET /api/v1/invoices
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'invoices:read')
  if (scopeErr) return scopeErr

  const p = new URL(request.url).searchParams
  const status      = p.get('status')
  const page        = Math.max(1, parseInt(p.get('page')  ?? '1'))
  const limit       = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '20')))
  const from_date   = p.get('from_date')
  const to_date     = p.get('to_date')
  const client_name = p.get('client_name')

  const admin = createAdminClient()
  let q = admin.from('invoices').select('*', { count: 'exact' }).eq('user_id', auth.userId)
  if (status)      q = q.eq('status', status)
  if (from_date)   q = q.gte('created_at', from_date)
  if (to_date)     q = q.lte('created_at', to_date)
  if (client_name) q = q.ilike('client_name', `%${client_name}%`)
  q = q.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, count, error: dbErr } = await q
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const res = apiSuccess(data ?? [], {
    page, limit, total: count ?? 0,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
  withRateLimitHeaders(res, auth)
  logRequest(auth, '/api/v1/invoices', 'GET', 200, Date.now() - start, request)
  return res
}

// POST /api/v1/invoices
export async function POST(request: NextRequest) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'invoices:write')
  if (scopeErr) return scopeErr

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Invalid JSON', 'INVALID_BODY', 400) }

  const {
    client_name, client_email, client_phone, contact_name,
    service_name, service_plan, renewal_date, notes,
    line_items, tax_rate, bank_account_id, currency,
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

  const { data: invoice, error: dbErr } = await admin.from('invoices').insert({
    user_id:          auth.userId,
    inv_number:       invNumber(),
    client_name:      client_name as string,
    client_email:     (client_email as string)   || null,
    client_phone:     (client_phone as string)   || null,
    contact_name:     (contact_name as string)   || null,
    service_name:     (service_name as string)   || null,
    service_plan:     (service_plan as string)   || null,
    renewal_date:     (renewal_date as string)   || null,
    notes:            (notes as string)          || null,
    line_items:       items,
    subtotal,
    tax_rate:         effectiveTaxRate,
    tax_amount:       taxAmount,
    total,
    currency:         effectiveCurrency,
    bank_account_id:  (bank_account_id as string) || null,
    status:           'pending',
  }).select().single()

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  triggerWebhook(auth.userId, 'invoice.created', invoice)

  const res = apiSuccess(invoice)
  withRateLimitHeaders(res, auth)
  logRequest(auth, '/api/v1/invoices', 'POST', 201, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
