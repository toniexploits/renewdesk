import Link from 'next/link'

export const metadata = {
  title: 'API Reference — RenewDesk',
  description: 'RenewDesk public REST API documentation for invoices, quotes, and clients.',
}

type Param = { name: string; type: string; required?: boolean; description: string }
type Endpoint = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  scopes?: string[]
  params?: Param[]
  body?: Param[]
  example?: string
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-700',
  POST:   'bg-green-100 text-green-700',
  PATCH:  'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const endpoints: Endpoint[] = [
  {
    method: 'GET', path: '/api/v1/invoices', summary: 'List invoices',
    scopes: ['invoices:read'],
    params: [
      { name: 'status', type: 'string', description: 'Filter by status: pending, paid, overdue, draft' },
      { name: 'client_name', type: 'string', description: 'Partial match on client name' },
      { name: 'from_date', type: 'ISO date', description: 'Filter created_at ≥ date' },
      { name: 'to_date', type: 'ISO date', description: 'Filter created_at ≤ date' },
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Results per page, max 100 (default: 20)' },
    ],
    example: `curl https://renewdesk.vercel.app/api/v1/invoices \\
  -H "Authorization: Bearer rdk_live_…"`,
  },
  {
    method: 'POST', path: '/api/v1/invoices', summary: 'Create invoice',
    scopes: ['invoices:write'],
    body: [
      { name: 'client_name', type: 'string', required: true, description: 'Client / company name' },
      { name: 'line_items', type: 'array', required: true, description: 'Array of {description, qty, unit_price}' },
      { name: 'client_email', type: 'string', description: 'Client email' },
      { name: 'client_phone', type: 'string', description: 'Client phone' },
      { name: 'service_name', type: 'string', description: 'Service name' },
      { name: 'renewal_date', type: 'ISO date', description: 'Renewal/due date (omit for one-time invoices)' },
      { name: 'tax_rate', type: 'number', description: 'Tax rate % (defaults to your profile rate)' },
      { name: 'currency', type: 'string', description: 'Currency code, e.g. NGN, USD (defaults to profile)' },
      { name: 'notes', type: 'string', description: 'Additional notes' },
    ],
    example: `curl -X POST https://renewdesk.vercel.app/api/v1/invoices \\
  -H "Authorization: Bearer rdk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_name": "Acme Corp",
    "client_email": "billing@acme.com",
    "service_name": "Web Hosting",
    "line_items": [{"description":"Annual plan","qty":1,"unit_price":50000}],
    "renewal_date": "2027-01-01"
  }'`,
  },
  {
    method: 'GET', path: '/api/v1/invoices/:id', summary: 'Get invoice',
    scopes: ['invoices:read'],
    example: `curl https://renewdesk.vercel.app/api/v1/invoices/uuid \\
  -H "Authorization: Bearer rdk_live_…"`,
  },
  {
    method: 'PATCH', path: '/api/v1/invoices/:id', summary: 'Update invoice',
    scopes: ['invoices:write'],
    body: [
      { name: 'status', type: 'string', description: 'pending | paid | overdue | draft' },
      { name: 'notes', type: 'string', description: 'Update notes' },
      { name: 'line_items', type: 'array', description: 'Replace line items (totals recalculated)' },
      { name: 'renewal_date', type: 'ISO date', description: 'Update renewal date' },
    ],
  },
  {
    method: 'DELETE', path: '/api/v1/invoices/:id', summary: 'Delete invoice',
    scopes: ['invoices:write'],
  },
  {
    method: 'GET', path: '/api/v1/quotes', summary: 'List quotes',
    scopes: ['quotes:read'],
    params: [
      { name: 'status', type: 'string', description: 'draft | sent | approved | rejected | converted' },
      { name: 'from_date', type: 'ISO date', description: 'Filter created_at ≥ date' },
      { name: 'to_date', type: 'ISO date', description: 'Filter created_at ≤ date' },
      { name: 'page', type: 'number', description: 'Page number' },
      { name: 'limit', type: 'number', description: 'Results per page, max 100' },
    ],
  },
  {
    method: 'POST', path: '/api/v1/quotes', summary: 'Create quote',
    scopes: ['quotes:write'],
    body: [
      { name: 'client_name', type: 'string', required: true, description: 'Client / company name' },
      { name: 'line_items', type: 'array', required: true, description: 'Array of {description, qty, unit_price}' },
      { name: 'validity_days', type: 'number', description: 'Days until expiry (default: 30)' },
      { name: 'client_email', type: 'string', description: 'Client email' },
      { name: 'notes', type: 'string', description: 'Additional notes' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/quotes/:id', summary: 'Get quote', scopes: ['quotes:read'] },
  {
    method: 'PATCH', path: '/api/v1/quotes/:id', summary: 'Update quote',
    scopes: ['quotes:write'],
    body: [
      { name: 'status', type: 'string', description: 'draft | sent | approved | rejected' },
      { name: 'validity_days', type: 'number', description: 'Recalculates valid_until from now' },
      { name: 'line_items', type: 'array', description: 'Replace line items (totals recalculated)' },
    ],
  },
  {
    method: 'POST', path: '/api/v1/quotes/:id/convert', summary: 'Convert quote to invoice',
    scopes: ['quotes:write', 'invoices:write'],
    example: `curl -X POST https://renewdesk.vercel.app/api/v1/quotes/uuid/convert \\
  -H "Authorization: Bearer rdk_live_…"`,
  },
  {
    method: 'GET', path: '/api/v1/clients', summary: 'List clients',
    scopes: ['clients:read'],
    params: [
      { name: 'q', type: 'string', description: 'Search by client name' },
      { name: 'page', type: 'number', description: 'Page number' },
      { name: 'limit', type: 'number', description: 'Results per page, max 100' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/clients/:email', summary: 'Get client with invoice summary',
    scopes: ['clients:read'],
    example: `curl "https://renewdesk.vercel.app/api/v1/clients/billing%40acme.com" \\
  -H "Authorization: Bearer rdk_live_…"`,
  },
]

const rateLimits = [
  { plan: 'Pro', rpm: 300 },
  { plan: 'Agency', rpm: 1000 },
]

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← renewdesk.vercel.app</Link>
          <h1 className="text-2xl font-bold text-gray-900">API Reference</h1>
          <p className="text-gray-500 mt-1 text-sm">
            REST API for invoices, quotes, and clients. Available on Pro and Agency plans.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium bg-brand text-white px-2 py-1 rounded">v1</span>
            <code className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded font-mono">
              https://renewdesk.vercel.app/api/v1
            </code>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* Authentication */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Authentication</h2>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-5 space-y-4">
            <p className="text-sm text-gray-700">
              All requests require an <strong>API key</strong> passed as a Bearer token:
            </p>
            <pre className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 text-xs overflow-x-auto font-mono">{`Authorization: Bearer rdk_live_<32 hex chars>`}</pre>
            <p className="text-sm text-gray-700">
              Generate keys in{' '}
              <Link href="/dashboard/settings/developer" className="text-brand underline">
                Dashboard → Developer
              </Link>.
              API keys are plan-gated (Pro: 5 keys, Agency: 10 keys).
            </p>
          </div>
        </section>

        {/* Rate limits */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Rate Limits</h2>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-5">
            <p className="text-sm text-gray-700 mb-4">Limits are per API key, per 60-second window.</p>
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              {rateLimits.map(r => (
                <div key={r.plan} className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">{r.plan}</p>
                  <p className="text-xl font-bold text-gray-900">{r.rpm}</p>
                  <p className="text-xs text-gray-400">req/min</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Response headers: <code className="bg-gray-200 px-1 rounded">X-RateLimit-Limit</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">X-RateLimit-Remaining</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">X-RateLimit-Reset</code>
            </p>
          </div>
        </section>

        {/* Response format */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Response Format</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Success</p>
              <pre className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 text-xs overflow-x-auto font-mono">{`{
  "success": true,
  "data": { … },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 43,
    "total_pages": 3
  }
}`}</pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Error</p>
              <pre className="bg-gray-900 text-red-300 rounded-lg px-4 py-3 text-xs overflow-x-auto font-mono">{`{
  "success": false,
  "error": "client_name is required",
  "code": "VALIDATION_ERROR"
}`}</pre>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Endpoints</h2>
          <div className="space-y-6">
            {endpoints.map((ep, i) => (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Endpoint header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${METHOD_COLORS[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-800 flex-1">{ep.path}</code>
                  <span className="text-sm text-gray-600 font-medium">{ep.summary}</span>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Scopes */}
                  {ep.scopes && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Requires:</span>
                      {ep.scopes.map(s => (
                        <span key={s} className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Query params */}
                  {ep.params && ep.params.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Query Parameters</p>
                      <div className="space-y-1">
                        {ep.params.map(p => (
                          <div key={p.name} className="flex items-start gap-3 text-sm">
                            <code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded w-28 flex-shrink-0">{p.name}</code>
                            <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">{p.type}</span>
                            <span className="text-xs text-gray-600">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  {ep.body && ep.body.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body (JSON)</p>
                      <div className="space-y-1">
                        {ep.body.map(p => (
                          <div key={p.name} className="flex items-start gap-3 text-sm">
                            <code className="text-[11px] font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded w-28 flex-shrink-0">{p.name}{p.required ? ' *' : ''}</code>
                            <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">{p.type}</span>
                            <span className="text-xs text-gray-600">{p.description}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">* required</p>
                    </div>
                  )}

                  {/* Example */}
                  {ep.example && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Example</p>
                      <pre className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 text-[11px] overflow-x-auto font-mono leading-relaxed">
                        {ep.example}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Webhooks */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Webhooks</h2>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-5 space-y-4">
            <p className="text-sm text-gray-700">
              Webhooks deliver real-time <code className="bg-gray-200 px-1 rounded text-xs">POST</code> notifications
              to your HTTPS endpoint when events occur. Register endpoints in{' '}
              <Link href="/dashboard/settings/developer" className="text-brand underline">Dashboard → Developer</Link>.
            </p>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Events</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['invoice.created','invoice.updated','invoice.paid','quote.created','quote.converted'].map(ev => (
                  <code key={ev} className="text-[11px] font-mono bg-white border border-gray-200 px-2 py-1 rounded text-gray-700">{ev}</code>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payload shape</p>
              <pre className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 text-xs overflow-x-auto font-mono">{`{
  "event": "invoice.created",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "data": { /* full resource object */ }
}`}</pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Signature verification</p>
              <p className="text-xs text-gray-600 mb-2">
                Each request includes <code className="bg-gray-200 px-1 rounded">X-RenewDesk-Signature: sha256=…</code>
              </p>
              <pre className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 text-xs overflow-x-auto font-mono">{`import crypto from 'crypto'

function isValid(secret, rawBody, header) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
          .update(rawBody).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(header)
  )
}`}</pre>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-8 pb-4 text-center">
          <p className="text-sm text-gray-400">
            Need help?{' '}
            <a href="mailto:support@renewdesk.co" className="text-brand hover:underline">support@renewdesk.co</a>
            {' · '}
            <Link href="/dashboard/settings/developer" className="text-brand hover:underline">Generate API key →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
