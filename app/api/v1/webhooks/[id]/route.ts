import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, handleOptions } from '@/lib/apiMiddleware'

export const dynamic = 'force-dynamic'

// DELETE /api/v1/webhooks/:id — remove a webhook (dashboard user)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return apiError('Unauthorized', 'UNAUTHORIZED', 401)

  const admin = createAdminClient()
  const { data: existing } = await admin.from('webhooks').select('id')
    .eq('id', params.id).eq('user_id', user.id).maybeSingle()

  if (!existing) return apiError('Webhook not found', 'NOT_FOUND', 404)

  const { error: dbErr } = await admin.from('webhooks')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (dbErr) return apiError(dbErr.message, 'DATABASE_ERROR', 500)

  return apiSuccess({ id: params.id, deleted: true })
}

export async function OPTIONS() { return handleOptions() }
