import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

export interface GeneratedKey {
  fullKey:  string
  prefix:   string   // first 20 chars — stored in DB for lookup
  lastFour: string   // last 4 chars — shown in UI
  hash:     string   // bcrypt hash — stored in DB
}

/** Generate a new API key. Returns the plain key ONCE — hash it immediately. */
export async function generateApiKey(): Promise<GeneratedKey> {
  const random  = crypto.randomBytes(16).toString('hex') // 32 hex chars
  const fullKey = `rdk_live_${random}`                   // e.g. rdk_live_a8f3...
  const prefix  = fullKey.slice(0, 20)                   // first 20 chars for lookup
  const lastFour = fullKey.slice(-4)
  const hash    = await bcrypt.hash(fullKey, 10)
  return { fullKey, prefix, lastFour, hash }
}

export interface VerifyResult {
  valid:   boolean
  userId?: string
  scopes?: string[]
  keyId?:  string
  plan?:   string
}

/** Verify an incoming API key from an Authorization header. */
export async function verifyApiKey(providedKey: string): Promise<VerifyResult> {
  if (!providedKey?.startsWith('rdk_live_')) return { valid: false }

  const prefix = providedKey.slice(0, 20)
  const admin  = createAdminClient()

  const { data: keys } = await admin
    .from('api_keys')
    .select('id, user_id, key_hash, is_active, expires_at, scopes')
    .eq('key_prefix', prefix)

  if (!keys?.length) return { valid: false }

  for (const key of keys) {
    const match = await bcrypt.compare(providedKey, key.key_hash)
    if (!match) continue
    if (!key.is_active) return { valid: false }
    if (key.expires_at && new Date(key.expires_at) < new Date()) return { valid: false }

    // Update last_used_at — fire and forget
    admin.from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id)
      .then(() => {})

    // Fetch subscription plan
    const { data: sub } = await admin
      .from('user_subscriptions')
      .select('plan_name')
      .eq('user_id', key.user_id)
      .single()

    return {
      valid:  true,
      userId: key.user_id,
      scopes: key.scopes ?? [],
      keyId:  key.id,
      plan:   sub?.plan_name ?? 'starter',
    }
  }

  return { valid: false }
}
