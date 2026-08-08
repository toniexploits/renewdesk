import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export type WebhookEvent =
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.paid'
  | 'quote.created'
  | 'quote.converted'
  | 'subscription.upgraded'

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<{ ok: boolean; status?: number; body?: string }> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
  const sig  = sign(secret, body)

  // Up to 3 immediate attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'X-RenewDesk-Event':    event,
          'X-RenewDesk-Signature': sig,
        },
        body,
        signal: AbortSignal.timeout(8000),
      })
      const resBody = await res.text().catch(() => '')
      if (res.ok) return { ok: true, status: res.status, body: resBody }
      if (attempt === 3) return { ok: false, status: res.status, body: resBody }
    } catch {
      if (attempt === 3) return { ok: false }
    }
  }
  return { ok: false }
}

/** Fire outgoing webhooks for an event. Call fire-and-forget. */
export function triggerWebhook(userId: string, event: WebhookEvent, payload: unknown): void {
  const admin = createAdminClient()

  admin
    .from('webhooks')
    .select('id, url, secret')
    .eq('user_id', userId)
    .eq('is_active', true)
    .contains('events', [event])
    .then(async ({ data: hooks }) => {
      if (!hooks?.length) return

      for (const hook of hooks) {
        const result = await deliverWebhook(hook.id, hook.url, hook.secret, event, payload)
        // Log delivery
        admin.from('webhook_deliveries').insert({
          webhook_id:      hook.id,
          user_id:         userId,
          event,
          payload,
          status:          result.ok ? 'delivered' : 'failed',
          attempts:        3,
          response_status: result.status ?? null,
          response_body:   result.body?.slice(0, 500) ?? null,
          delivered_at:    result.ok ? new Date().toISOString() : null,
        }).then(() => {})
      }
    })
}
