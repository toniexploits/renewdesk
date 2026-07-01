import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify agency plan
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_name')
    .eq('user_id', user.id)
    .single()
  if (sub?.plan_name !== 'agency') {
    return NextResponse.json({ error: 'Team members require the Agency plan.' }, { status: 403 })
  }

  const { email, role = 'member' } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  // Get owner's profile for the email
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()
  const ownerName = profile?.business_name || profile?.full_name || 'Your team owner'

  // Create invitation record
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertErr } = await supabase.from('team_invitations').insert({
    owner_id: user.id,
    invited_email: email.toLowerCase().trim(),
    role,
    token,
    status: 'pending',
    expires_at: expiresAt,
    owner_name: ownerName,
  })
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Send invitation email
  const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://renewdeskapp.com'}/accept-invite?token=${token}`

  try {
    await resend.emails.send({
      from: 'RenewDesk <hello@renewdeskapp.com>',
      to: email,
      subject: `${ownerName} invited you to join their RenewDesk workspace`,
      html: buildInviteEmailHtml({ ownerName, role, acceptUrl }),
    })
  } catch (emailErr) {
    console.error('Invite email failed:', emailErr)
    // Don't fail the request — invitation is saved; user can resend
  }

  return NextResponse.json({ ok: true })
}

function buildInviteEmailHtml({
  ownerName,
  role,
  acceptUrl,
}: {
  ownerName: string
  role: string
  acceptUrl: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#085041;padding:24px 28px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">RenewDesk</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 20px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111;">You&apos;ve been invited!</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">
              <strong>${ownerName}</strong> has invited you to join their RenewDesk workspace as a <strong>${role}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
              Click the button below to accept the invitation and access the workspace. This link expires in 7 days.
            </p>
            <a href="${acceptUrl}"
              style="display:inline-block;padding:13px 28px;background:#085041;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
              Accept invitation
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:12px;color:#9e9e99;line-height:1.6;">
              If you didn&apos;t expect this invitation, you can safely ignore this email.<br/>
              &copy; ${new Date().getFullYear()} RenewDesk &middot; <a href="https://renewdeskapp.com" style="color:#085041;text-decoration:none;">renewdeskapp.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
