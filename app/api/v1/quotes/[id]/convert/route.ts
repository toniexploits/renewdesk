import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'
import { triggerWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

// POST /api/v1/quotes/:id/convert
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error

  // Requires both quotes:write AND invoices:write
  const qErr = checkScope(auth.scopes, 'quotes:write')
  if (qErr) return qErr
  const iErr = checkScope(auth.scopes, 'invoices:write')
  if (iErr) return iErr

  const admin = createAdminClient()
  const { data: quote, error: fetchErr } = await admin.from('quotes').select('*')
    .eq('id', params.id).eq('user_id', auth.userId).maybeSingle()

  if (fetchErr) return apiError(fetchErr.message, 'DATABASE_ERROR', 500)
  if (!quote)   return apiError('Quote not found', 'NOT_FOUND', 404)
  if (quote.status === 'converted') {
    return apiError('Quote is already converted', 'ALREADY_CONVERTED', 409)
  }

  const q = quote as Record<string, unknown>

  // Create invoice from quote
  const { data: invoice, error: invErr } = await admin.from('invoices').insert({
    user_id:      auth.userId,
    inv_number:   `INV-${Date.now().toString().slice(-6)}`,
    client_name:  q.client_name,
    client_email: q.client_email,
    client_phone: q.client_phone,
    contact_name: q.contact_name,
    service_name: q.service_name,
    service_plan: q.service_plan,
    line_items:   q.line_items,
    subtotal:     q.subtotal,
    tax_rate:     q.tax_rate,
    tax_amount:   q.tax_amount,
    total:        q.total,
    currency:     q.currency,
    notes:        q.notes,
    status:       'pending',
  }).select().single()

  if (invErr) return apiError(invErr.message, 'DATABASE_ERROR', 500)

  // Mark quote as converted
  const { data: updatedQuote } = await admin.from('quotes')
    .update({ status: 'converted', converted_invoice_id: invoice.id, updated_at: new Date().toISOString() })
    .eq('id', params.id).select().single()

  triggerWebhook(auth.userId, 'quote.converted', { invoice, quote: updatedQuote })

  const res = apiSuccess({ invoice, quote: updatedQuote })
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/quotes/${params.id}/convert`, 'POST', 200, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
