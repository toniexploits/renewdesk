import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function logEvent(eventType: string): void {
  const supabase = createClient()
  supabase.auth.getUser().then((res: { data: { user: User | null }; error: unknown }) => {
    const user = res.data.user
    if (user) {
      supabase.from('app_events').insert({ user_id: user.id, event_type: eventType })
    }
  })
}
