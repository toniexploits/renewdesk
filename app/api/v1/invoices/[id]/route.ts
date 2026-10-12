import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'
import { triggerWebhook } from '@/lib/webhooks'
import { calcDiscount } from '@/lib/format'
import type { DiscountType } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /api/v1/invoices/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'invoices:read')
  if (scopeErr) return scopeErr

  const admin = createAdminClient()
  const { data, error: dbErr } = await admin.from('invoices').select('*')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()

  if (dbErr)  return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  if (!data)  return apiError('Invoice not found', 'NOT_FOUND', 404)

  const res = apiSuccess(data)
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/invoices/${params.id}`, 'GET', 200, Date.now() - start, request)
  return res
}

// PATCH /api/v1/invoices/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'invoices:write')
  if (scopeErr) return scopeErr

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return apiError('Invalid JSON', 'INVALID_BODY', 400) }

  const admin = createAdminClient()
  const { data: existing, error: fetchErr } = await admin.from('invoices').select('*')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()
  if (fetchErr) return apiError(fetchErr.message, 'DATABASE_ERROR', 500)
  if (!existing) return apiError('Invoice not found', 'NOT_FOUND', 404)

  const allowed = ['status','notes','renewal_date','line_items','client_name',
                   'client_email','client_phone','service_name','service_plan','currency']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Discount: omitted fields keep their saved values
  const ex = existing as Record<string, unknown>
  const { discount_type, discount_value } = body
  if (discount_type !== undefined && discount_type !== 'percent' && discount_type !== 'fixed') {
    return apiError("discount_type must be 'percent' or 'fixed'", 'VALIDATION_ERROR', 400)
  }
  if (discount_value !== undefined && (typeof discount_value !== 'number' || !Number.isFinite(discount_value) || discount_value < 0)) {
    return apiError('discount_value must be a non-negative number', 'VALIDATION_ERROR', 400)
  }
  const discountType: DiscountType = (discount_type ?? ex.discount_type ?? 'percent') === 'fixed' ? 'fixed' : 'percent'
  const discountValue = discount_value !== undefined ? (discount_value as number) : Number(ex.discount_value ?? 0)
  if (discountType === 'percent' && discountValue > 100) {
    return apiError('discount_value cannot exceed 100 for a percent discount', 'VALIDATION_ERROR', 400)
  }

  if (updates.line_items !== undefined && !Array.isArray(updates.line_items)) {
    return apiError('line_items must be an array', 'VALIDATION_ERROR', 400)
  }

  // Recalculate totals if line_items or discount updated
  if (Array.isArray(updates.line_items) || discount_type !== undefined || discount_value !== undefined) {
    let subtotal = Number(ex.subtotal ?? 0)
    if (Array.isArray(updates.line_items)) {
      const items = (updates.line_items as Array<Record<string,unknown>>).map((i, idx) => ({
        id:    i.id ?? `${Date.now()}-${idx}`,
        desc:  String(i.desc ?? i.description ?? ''),
        qty:   Number(i.qty ?? 1),
        price: Number(i.price ?? i.unit_price ?? 0),
      }))
      updates.line_items = items
      subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
    }
    const taxRate   = (ex.tax_rate as number) ?? 7.5
    const discount  = calcDiscount(subtotal, discountType, discountValue)
    const taxAmount = ((subtotal - discount) * taxRate) / 100
    updates.subtotal        = subtotal
    updates.discount_type   = discountType
    updates.discount_value  = discount > 0 ? discountValue : 0
    updates.discount_amount = discount
    updates.tax_amount      = taxAmount
    updates.total           = subtotal - discount + taxAmount
  }

  const { data: updated, error: dbErr } = await admin.from('invoices')
    .update(updates).eq('id', params.id).select().single()
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const event = updates.status === 'paid' ? 'invoice.paid' : 'invoice.updated'
  triggerWebhook(auth.userId, event, updated)

  const res = apiSuccess(updated)
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/invoices/${params.id}`, 'PATCH', 200, Date.now() - start, request)
  return res
}

// DELETE /api/v1/invoices/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'invoices:write')
  if (scopeErr) return scopeErr

  const admin = createAdminClient()
  const { data: existing } = await admin.from('invoices').select('id')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()
  if (!existing) return apiError('Invoice not found', 'NOT_FOUND', 404)

  const { error: dbErr } = await admin.from('invoices').delete().eq('id', params.id)
  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  const res = apiSuccess({ id: params.id, message: 'Invoice deleted' })
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/invoices/${params.id}`, 'DELETE', 200, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
