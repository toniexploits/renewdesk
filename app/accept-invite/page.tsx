'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type PageState = 'loading' | 'invalid' | 'expired' | 'already_accepted' | 'prompt_login' | 'accepting' | 'success' | 'error'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [state, setState] = useState<PageState>('loading')
  const [ownerName, setOwnerName] = useState('')
  const [role, setRole] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    checkInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function checkInvite() {
    const supabase = createClient()

    const { data: invite } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!invite) { setState('invalid'); return }
    if (invite.status === 'accepted') { setState('already_accepted'); return }
    if (invite.status === 'revoked') { setState('invalid'); return }
    if (new Date(invite.expires_at) < new Date()) { setState('expired'); return }

    setOwnerName(invite.owner_name || 'your team owner')
    setRole(invite.role)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setState('prompt_login')
    } else {
      await acceptInvite(session.user.id, { token: String(token) })
    }
  }

  async function acceptInvite(_userId: string, invite: { token?: string }) {
    setState('accepting')

    const res = await fetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: invite.token ?? token }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (res.status === 409) { setState('already_accepted'); return }
      if (res.status === 410) { setState('expired'); return }
      setState('error')
      setErrorMsg(body.error || 'Unable to accept invitation.')
      return
    }

    setState('success')
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  async function handleAcceptAfterLogin() {
    setState('loading')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.push(`/login?redirect=/accept-invite?token=${token}`)
      return
    }

    const { data: invite } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!invite) { setState('invalid'); return }
    await acceptInvite(session.user.id, { token: String(token) })
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl p-8"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.3px' }}>RenewDesk</p>
        </div>

        {state === 'loading' || state === 'accepting' ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">{state === 'accepting' ? 'Accepting invitation…' : 'Loading…'}</p>
          </div>
        ) : state === 'success' ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h2>
            <p className="text-sm text-gray-500 mb-6">
              You&apos;ve joined <strong>{ownerName}&apos;s</strong> workspace as a <strong>{role}</strong>.
              Redirecting to your dashboard…
            </p>
            <Link href="/dashboard" className="text-sm text-brand font-medium hover:underline">
              Go to dashboard →
            </Link>
          </div>
        ) : state === 'already_accepted' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Already accepted</h2>
            <p className="text-sm text-gray-500 mb-6">This invitation has already been used.</p>
            <Link href="/dashboard" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark">
              Go to dashboard
            </Link>
          </div>
        ) : state === 'expired' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation expired</h2>
            <p className="text-sm text-gray-500 mb-6">This invitation link expired after 7 days. Ask your team owner to send a new one.</p>
          </div>
        ) : state === 'invalid' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid invitation</h2>
            <p className="text-sm text-gray-500 mb-6">This invitation link is invalid or has been revoked.</p>
            <Link href="/" className="text-sm text-brand font-medium hover:underline">Back to home</Link>
          </div>
        ) : state === 'prompt_login' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Join {ownerName}&apos;s workspace</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              You&apos;ve been invited as a <strong>{role}</strong>. Sign in or create a free account to accept the invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/login?redirect=/accept-invite?token=${token}`}
                className="flex items-center justify-center px-5 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
              >
                Sign in to accept
              </Link>
              <Link
                href={`/signup?redirect=/accept-invite?token=${token}`}
                className="flex items-center justify-center px-5 py-3 border border-black/10 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Create an account
              </Link>
            </div>
            <button
              onClick={handleAcceptAfterLogin}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600"
            >
              Already signed in? Click to continue
            </button>
          </div>
        ) : state === 'error' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-2">{errorMsg || 'Unable to accept invitation. Please try again.'}</p>
            <button
              onClick={() => { setState('loading'); checkInvite() }}
              className="text-sm text-brand font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
