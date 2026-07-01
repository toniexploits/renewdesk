import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the membership row belongs to this owner before deleting
  const { data: member } = await supabase
    .from('team_members')
    .select('id, owner_id')
    .eq('id', params.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
  }
  if (member.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
