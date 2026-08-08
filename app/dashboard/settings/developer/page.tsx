'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeModal from '@/components/UpgradeModal'

type ApiKey = {
  id: string
  name: string
  key_prefix: string
  last_four: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
}

type Webhook = {
  id: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

type NewKeyData = { key: string; id: string; name: string }

const ALL_SCOPES = ['invoices:read','invoices:write','quotes:read','quotes:write','clients:read']
const ALL_EVENTS = ['invoice.created','invoice.updated','invoice.paid','quote.created','quote.converted']

export default function DeveloperPage() {
  const { plan } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)

  // New key form
  const [keyName, setKeyName] = useState('')
  const [keyScopes, setKeyScopes] = useState<string[]>(ALL_SCOPES)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyData | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  // Webhook form
  const [whUrl, setWhUrl] = useState('')
  const [whEvents, setWhEvents] = useState<string[]>(ALL_EVENTS)
  const [creatingWh, setCreatingWh] = useState(false)
  const [newWhSecret, setNewWhSecret] = useState<string | null>(null)
  const [whCopied, setWhCopied] = useState(false)

  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [keysRes, whRes] = await Promise.all([
      fetch('/api/v1/keys'),
      fetch('/api/v1/webhooks'),
    ])
    if (keysRes.ok) setKeys((await keysRes.json()).data ?? [])
    if (whRes.ok)  setWebhooks((await whRes.json()).data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const isPaidPlan = plan === 'pro' || plan === 'agency'

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!keyName.trim()) { setError('Key name is required'); return }
    setCreatingKey(true)
    const res = await fetch('/api/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: keyName.trim(), scopes: keyScopes }),
    })
    const json = await res.json()
    setCreatingKey(false)
    if (!res.ok) { setError(json.error ?? 'Failed to create key'); return }
    setNewKey({ key: json.data.key, id: json.data.id, name: json.data.name })
    setKeyName('')
    setKeyScopes(ALL_SCOPES)
    load()
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Any apps using it will stop working.')) return
    const res = await fetch(`/api/v1/keys/${id}`, { method: 'DELETE' })
    if (res.ok) { setKeys(prev => prev.filter(k => k.id !== id)) }
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!whUrl.startsWith('https://')) { setError('Webhook URL must start with https://'); return }
    if (whEvents.length === 0) { setError('Select at least one event'); return }
    setCreatingWh(true)
    const res = await fetch('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: whUrl, events: whEvents }),
    })
    const json = await res.json()
    setCreatingWh(false)
    if (!res.ok) { setError(json.error ?? 'Failed to create webhook'); return }
    setNewWhSecret(json.data.secret)
    setWhUrl('')
    setWhEvents(ALL_EVENTS)
    load()
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook?')) return
    const res = await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE' })
    if (res.ok) { setWebhooks(prev => prev.filter(w => w.id !== id)) }
  }

  function toggleScope(s: string) {
    setKeyScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleEvent(e: string) {
    setWhEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function fmtDate(d: string | null) {
    if (!d) return 'Never'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded"/>
          <div className="h-32 bg-gray-100 rounded-xl"/>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Developer</h1>
        <p className="text-sm text-gray-500 mt-1">Manage API keys and webhooks to integrate RenewDesk with your apps.</p>
      </div>

      {/* Base URL info */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Base URL</p>
        <code className="text-sm text-gray-800 font-mono">https://renewdeskapp.com/api/v1</code>
        <p className="text-xs text-gray-500 mt-2">
          Authenticate with <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">Authorization: Bearer rdk_live_…</code> header.
          {' '}<a href="/api-docs" className="text-brand underline" target="_blank">View full API docs →</a>
        </p>
      </div>

      {!isPaidPlan && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">API access requires a Pro or Agency plan.</p>
          <button onClick={() => setUpgradeOpen(true)} className="mt-2 text-sm text-brand font-medium hover:underline">
            Upgrade your plan →
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Revealed new key */}
      {newKey && (
        <div className="rounded-xl border-2 border-brand/30 bg-green-50 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">
            ✓ Key created: <span className="font-normal">{newKey.name}</span>
          </p>
          <p className="text-xs text-green-700 mb-2">Copy this key now &mdash; it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white rounded px-3 py-2 border border-green-200 break-all">
              {newKey.key}
            </code>
            <button
              onClick={() => copyText(newKey.key, setKeyCopied)}
              className="px-3 py-2 text-xs rounded-lg bg-brand text-white font-medium hover:bg-brand/90 flex-shrink-0"
            >
              {keyCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Dismiss</button>
        </div>
      )}

      {/* Revealed webhook secret */}
      {newWhSecret && (
        <div className="rounded-xl border-2 border-brand/30 bg-green-50 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">✓ Webhook created — save the signing secret</p>
          <p className="text-xs text-green-700 mb-2">Use this to verify webhook payloads. It won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white rounded px-3 py-2 border border-green-200 break-all">
              {newWhSecret}
            </code>
            <button
              onClick={() => copyText(newWhSecret, setWhCopied)}
              className="px-3 py-2 text-xs rounded-lg bg-brand text-white font-medium hover:bg-brand/90 flex-shrink-0"
            >
              {whCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewWhSecret(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Dismiss</button>
        </div>
      )}

      {/* API Keys */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">API Keys</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan === 'pro' ? '5' : plan === 'agency' ? '10' : '0'} max on {plan} plan
            </p>
          </div>
        </div>

        {/* Create key form */}
        {isPaidPlan && (
          <form onSubmit={createKey} className="rounded-xl border border-gray-200 px-5 py-4 mb-4 space-y-4 bg-white">
            <p className="text-sm font-medium text-gray-700">Create new key</p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Key name</label>
              <input
                type="text"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Production, Zapier integration"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Scopes</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keyScopes.includes(s)}
                      onChange={() => toggleScope(s)}
                      className="accent-brand"
                    />
                    <span className="font-mono">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creatingKey}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50"
            >
              {creatingKey ? 'Creating…' : 'Create key'}
            </button>
          </form>
        )}

        {/* Keys list */}
        {keys.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {k.key_prefix}…{k.last_four}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {fmtDate(k.created_at)} · Last used {fmtDate(k.last_used_at)}
                    {k.expires_at ? ` · Expires ${fmtDate(k.expires_at)}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {k.scopes.map(s => (
                      <span key={s} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Webhooks</h2>
          <p className="text-xs text-gray-500 mt-0.5">Receive real-time POST requests when events occur in RenewDesk.</p>
        </div>

        {isPaidPlan && (
          <form onSubmit={createWebhook} className="rounded-xl border border-gray-200 px-5 py-4 mb-4 space-y-4 bg-white">
            <p className="text-sm font-medium text-gray-700">Register endpoint</p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Endpoint URL (https://)</label>
              <input
                type="url"
                value={whUrl}
                onChange={e => setWhUrl(e.target.value)}
                placeholder="https://your-app.com/webhooks/renewdesk"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Events to subscribe</p>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="accent-brand"
                    />
                    <span className="font-mono">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creatingWh}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50"
            >
              {creatingWh ? 'Registering…' : 'Register webhook'}
            </button>
          </form>
        )}

        {webhooks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No webhooks registered.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map(w => (
              <div key={w.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-800 break-all">{w.url}</p>
                  <p className="text-xs text-gray-400 mt-1">Created {fmtDate(w.created_at)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.events.map(ev => (
                      <span key={ev} className="text-[10px] font-mono bg-brand/10 text-brand px-1.5 py-0.5 rounded">{ev}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteWebhook(w.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 mt-0.5"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verification info */}
      {isPaidPlan && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Verifying webhook signatures</h3>
          <p className="text-xs text-gray-500 mb-3">
            Each webhook request includes an <code className="bg-gray-200 px-1 rounded">X-RenewDesk-Signature</code> header
            with an HMAC-SHA256 signature of the request body, prefixed <code className="bg-gray-200 px-1 rounded">sha256=</code>.
          </p>
          <pre className="text-[11px] bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto leading-relaxed">{`import crypto from 'crypto'

function verifySignature(secret, body, sigHeader) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
          .update(body)
          .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(sigHeader)
  )
}`}</pre>
        </section>
      )}

      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
