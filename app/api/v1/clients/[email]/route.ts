import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authenticateApiRequest, checkScope, apiSuccess, apiError,
  handleOptions, logRequest, withRateLimitHeaders,
} from '@/lib/apiMiddleware'

export const dynamic = 'force-dynamic'

// GET /api/v1/clients/:email
// Returns client record with invoice summary stats
export async function GET(request: NextRequest, { params }: { params: { email: string } }) {
  const start = Date.now()
  const { auth, error } = await authenticateApiRequest(request)
  if (error) return error
  const scopeErr = checkScope(auth.scopes, 'clients:read')
  if (scopeErr) return scopeErr

  const email = decodeURIComponent(params.email)
  const admin = createAdminClient()

  const { data: client, error: dbErr } = await admin.from('clients').select('*')
    .eq('user_id', auth.userId).eq('email', email).maybeSingle()

  if (dbErr)    return apiError(dbErr.message, 'DATABASE_ERROR', 500)
  if (!client)  return apiError('Client not found', 'NOT_FOUND', 404)

  // Invoice summary for this client
  const { data: invoices } = await admin.from('invoices')
    .select('id, status, total, created_at')
    .eq('user_id', auth.userId)
    .eq('client_email', email)
    .order('created_at', { ascending: false })

  const summary = {
    total_invoices: invoices?.length ?? 0,
    paid:   invoices?.filter(i => i.status === 'paid').length ?? 0,
    pending: invoices?.filter(i => i.status === 'pending').length ?? 0,
    overdue: invoices?.filter(i => i.status === 'overdue').length ?? 0,
    total_billed: invoices?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0,
    total_paid:   invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0) ?? 0,
    recent_invoices: (invoices ?? []).slice(0, 5),
  }

  const res = apiSuccess({ ...client, invoice_summary: summary })
  withRateLimitHeaders(res, auth)
  logRequest(auth, `/api/v1/clients/${email}`, 'GET', 200, Date.now() - start, request)
  return res
}

export async function OPTIONS() { return handleOptions() }
