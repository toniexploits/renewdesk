'use client'

import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'

interface InvoiceRowProps {
  invoice: Invoice
  readonly?: boolean
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: InvoiceStatus) => void
}

const STATUS_OPTIONS: InvoiceStatus[] = ['pending', 'paid', 'overdue', 'cancelled']

// ─── Receipt PDF ─────────────────────────────────────────────────────────────

function generateReceiptHtml(inv: Invoice): string {
  const esc = (s: string) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const currency = inv.currency ?? 'NGN'
  const paidDate = new Date(inv.updated_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const dueDate = inv.renewal_date
    ? new Date(inv.renewal_date + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : 'Upon renewal'

  const items: { desc: string; qty: number; price: number }[] = Array.isArray(inv.line_items)
    ? inv.line_items
    : []

  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.desc || 'Item')}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${formatAmount(i.price, currency)}</td><td style="text-align:right">${formatAmount(i.qty * i.price, currency)}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt — ${esc(inv.inv_number)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',Arial,sans-serif;background:#fff;color:#1a1a18;padding:40px;}
  @media print{body{padding:20px;} @page{margin:20mm;}}
  h1{font-size:28px;color:#1D9E75;font-family:Georgia,serif;font-weight:700;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
  .meta{font-size:12px;color:#6b6b67;line-height:1.8;text-align:right;}
  .meta-biz{font-size:13px;font-weight:600;color:#1a1a18;}
  .svc{font-size:12px;color:#6b6b67;margin-top:4px;}
  .parties{display:flex;gap:24px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(0,0,0,0.10);}
  .party-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9e9e99;margin-bottom:4px;}
  .party-val{font-size:12px;color:#1a1a18;line-height:1.7;}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9e9e99;text-align:left;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.10);}
  td{padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.07);color:#1a1a18;}
  .tot{display:flex;justify-content:space-between;font-size:12px;color:#6b6b67;padding:2px 0;}
  .grand{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#1a1a18;border-top:1.5px solid rgba(0,0,0,0.13);padding-top:8px;margin-top:4px;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#D1FAE5;color:#065F46;}
  .paid-note{margin-top:20px;padding:12px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;font-size:12px;color:#065F46;}
</style>
</head>
<body>
<div class="top">
  <div>
    <h1>Receipt</h1>
    <div class="svc">${esc(inv.service_name || 'Service')}${inv.service_plan ? ' &mdash; ' + esc(inv.service_plan) : ''}</div>
  </div>
  <div class="meta">
    <div class="meta-biz">${esc(inv.client_name || 'Client')}</div>
    <div style="margin-top:8px">${esc(inv.inv_number)}</div>
    <div>Renewal: ${dueDate}</div>
    <div>Paid: ${paidDate}</div>
    <div style="margin-top:8px"><span class="badge">Paid</span></div>
  </div>
</div>
<div class="parties">
  <div>
    <div class="party-label">From</div>
    <div class="party-val">${esc(inv.client_name || 'Client')}${inv.contact_name ? '<br>' + esc(inv.contact_name) : ''}${inv.client_email ? '<br>' + esc(inv.client_email) : ''}</div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Unit price</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="tot"><span>Subtotal</span><span>${formatAmount(inv.subtotal, currency)}</span></div>
<div class="tot"><span>Tax (${inv.tax_rate}%)</span><span>${formatAmount(inv.tax_amount, currency)}</span></div>
<div class="grand"><span>Total paid</span><span>${formatAmount(inv.total, currency)}</span></div>
<div class="paid-note">Payment received on ${paidDate}. Thank you for your business!</div>
</body>
</html>`
}

// ─── Receipt WhatsApp message ────────────────────────────────────────────────

function buildReceiptWhatsAppLink(inv: Invoice): string {
  const phone = (inv.client_phone ?? '').replace(/\D/g, '')
  const currency = inv.currency ?? 'NGN'
  const paidDate = new Date(inv.updated_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const svc = inv.service_name || 'your service'
  const plan = inv.service_plan ? ` (${inv.service_plan})` : ''

  const msg = [
    `Hello ${inv.client_name || 'there'},`,
    ``,
    `Your payment for *${svc}${plan}* has been received. 🎉`,
    ``,
    `*Receipt details*`,
    `Invoice: ${inv.inv_number}`,
    `Amount paid: *${formatAmount(inv.total, currency)}*`,
    `Date: ${paidDate}`,
    ``,
    `Thank you for your business! Reach out if you have any questions.`,
  ].join('\n')

  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(msg)}`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function WAIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.392A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.073-1.119l-.292-.173-3.014.842.857-2.939-.19-.301A8 8 0 1112 20z"/>
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceRow({
  invoice,
  readonly = false,
  onDelete,
  onStatusChange,
}: InvoiceRowProps) {
  const supabase = createClient()

  async function handleStatusChange(newStatus: InvoiceStatus) {
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', invoice.id)
    if (!error && onStatusChange) {
      onStatusChange(invoice.id, newStatus)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete invoice ${invoice.inv_number}? This cannot be undone.`)) return
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    if (!error && onDelete) {
      onDelete(invoice.id)
    }
  }

  function handleDownloadReceipt() {
    const html = generateReceiptHtml(invoice)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  const renewalDate = invoice.renewal_date
    ? new Date(invoice.renewal_date + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  const isPaid = invoice.status === 'paid'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Client info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {invoice.client_name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {[invoice.service_name, invoice.inv_number].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Renewal date — hidden on mobile */}
      <div className="hidden sm:block w-28 text-right flex-shrink-0">
        <p className="text-xs text-gray-500">{renewalDate}</p>
      </div>

      {/* Total */}
      <div className="w-24 text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">
          {formatAmount(invoice.total, invoice.currency ?? 'NGN')}
        </p>
      </div>

      {/* Status */}
      <div className="w-28 flex-shrink-0 flex justify-end">
        {readonly ? (
          <StatusBadge status={invoice.status} />
        ) : (
          <select
            value={invoice.status}
            onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
            className="text-xs rounded-lg border border-black/10 bg-surface px-2 py-1 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Receipt actions — only when paid */}
      {isPaid && !readonly && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleDownloadReceipt}
            title="Download PDF receipt"
            className="p-1.5 rounded-md text-brand hover:bg-brand/10 transition-colors"
          >
            <PdfIcon />
          </button>
          <a
            href={buildReceiptWhatsAppLink(invoice)}
            target="_blank"
            rel="noopener noreferrer"
            title="Send receipt via WhatsApp"
            className="p-1.5 rounded-md text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
          >
            <WAIcon />
          </a>
        </div>
      )}

      {/* Delete button */}
      {!readonly && (
        <button
          onClick={handleDelete}
          className="flex-shrink-0 ml-1 text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
          title="Delete invoice"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}
