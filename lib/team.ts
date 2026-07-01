import { createClient } from '@/lib/supabase/server'

/**
 * Returns the owner's user ID if the given userId is a team member,
 * otherwise returns userId unchanged. Used in server components and
 * API routes to scope all data queries to the right workspace.
 */
export async function getEffectiveUserId(userId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('team_members')
    .select('owner_id')
    .eq('member_user_id', userId)
    .maybeSingle()
  return data?.owner_id ?? userId
}
