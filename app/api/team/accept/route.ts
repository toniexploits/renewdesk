import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch and validate invitation
  const { data: invite, error: inviteErr } = await admin
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (inviteErr || !invite) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  if (invite.status === 'accepted') return NextResponse.json({ error: 'already_accepted' }, { status: 409 })
  if (invite.status === 'revoked') return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })

  // Insert team member (admin client bypasses RLS)
  const { error: memberErr } = await admin
    .from('team_members')
    .insert({
      owner_id: invite.owner_id,
      member_user_id: user.id,
      role: invite.role,
      member_email: invite.invited_email,
    })

  if (memberErr && !memberErr.message.includes('duplicate')) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Mark invitation as accepted
  await admin
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true })
}
