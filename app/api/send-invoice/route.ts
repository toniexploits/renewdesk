import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { formatAmount } from '@/lib/format'

const resend = new Resend(process.env.RESEND_API_KEY)

interface InvoiceLineItem {
  desc: string
  qty: number
  price: number
}

interface InvoiceData {
  invNumber: string
  clientName: string
  bizName: string
  bizEmail?: string
  serviceName?: string
  servicePlan?: string
  renewalDate?: string
  currency: string
  taxRate: number
  items: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  grand: number
  bankName?: string
  accountName?: string
  accountNumber?: string
  swiftCode?: string
  iban?: string
}

interface SendInvoiceRequest {
  invoiceData: InvoiceData
  recipientEmail: string
  pdfBase64: string
}

function buildEmailHtml(d: InvoiceData, recipientEmail: string): string {
  const dueDate = d.renewalDate
    ? new Date(d.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Upon renewal'

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const svc = [d.serviceName, d.servicePlan].filter(Boolean).join(' — ')

  const itemRows = d.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0efeb;color:#1a1a18;font-size:13px;">${item.desc || 'Item'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0efeb;color:#1a1a18;font-size:13px;text-align:center;">${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0efeb;color:#1a1a18;font-size:13px;text-align:right;">${formatAmount(item.price, d.currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0efeb;color:#1a1a18;font-size:13px;text-align:right;font-weight:600;">${formatAmount(item.qty * item.price, d.currency)}</td>
      </tr>`
    )
    .join('')

  const hasBankDetails = d.bankName || d.accountName || d.accountNumber
  const bankSection = hasBankDetails
    ? `
    <div style="margin-top:24px;padding:16px;background:#f7f6f2;border-radius:8px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Payment details</p>
      ${d.bankName ? `<p style="margin:0 0 4px;font-size:13px;color:#1a1a18;"><strong>Bank:</strong> ${d.bankName}</p>` : ''}
      ${d.accountName ? `<p style="margin:0 0 4px;font-size:13px;color:#1a1a18;"><strong>Account name:</strong> ${d.accountName}</p>` : ''}
      ${d.accountNumber ? `<p style="margin:0 0 4px;font-size:13px;color:#1a1a18;"><strong>Account number:</strong> ${d.accountNumber}</p>` : ''}
      ${d.swiftCode ? `<p style="margin:0 0 4px;font-size:13px;color:#1a1a18;"><strong>SWIFT/BIC:</strong> ${d.swiftCode}</p>` : ''}
      ${d.iban ? `<p style="margin:0;font-size:13px;color:#1a1a18;"><strong>IBAN:</strong> ${d.iban}</p>` : ''}
    </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Invoice ${d.invNumber}</title></head>
<body style="margin:0;padding:0;background:#f7f6f2;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:20px;font-weight:700;color:#1D9E75;letter-spacing:-0.02em;">RenewDesk</span>
                </td>
                <td align="right">
                  <span style="font-size:12px;color:#9e9e99;">${today}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Invoice card -->
        <tr>
          <td style="background:#ffffff;border-radius:12px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.04);overflow:hidden;">

            <!-- Green top bar -->
            <div style="background:#1D9E75;padding:20px 24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">Invoice</p>
              ${svc ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">${svc}</p>` : ''}
            </div>

            <div style="padding:24px;">

              <!-- Summary grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding-right:16px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Invoice #</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a18;">${d.invNumber}</p>
                  </td>
                  <td>
                    <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Due date</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a18;">${dueDate}</p>
                  </td>
                </tr>
              </table>

              <!-- Parties -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #f0efeb;">
                <tr>
                  <td style="padding-right:16px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">From</p>
                    <p style="margin:0;font-size:13px;color:#1a1a18;line-height:1.6;">${d.bizName || 'Your Business'}${d.bizEmail ? '<br/>' + d.bizEmail : ''}</p>
                  </td>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Bill to</p>
                    <p style="margin:0;font-size:13px;color:#1a1a18;line-height:1.6;">${d.clientName || 'Client'}${recipientEmail ? '<br/>' + recipientEmail : ''}</p>
                  </td>
                </tr>
              </table>

              <!-- Line items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <thead>
                  <tr style="border-bottom:1px solid #f0efeb;">
                    <th style="padding:6px 12px 10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Description</th>
                    <th style="padding:6px 12px 10px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Qty</th>
                    <th style="padding:6px 12px 10px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Price</th>
                    <th style="padding:6px 12px 10px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9e9e99;">Amount</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
                <tr>
                  <td style="padding:4px 12px;font-size:13px;color:#6b6b67;">Subtotal</td>
                  <td style="padding:4px 12px;font-size:13px;color:#6b6b67;text-align:right;">${formatAmount(d.subtotal, d.currency)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 12px;font-size:13px;color:#6b6b67;">Tax (${d.taxRate}%)</td>
                  <td style="padding:4px 12px;font-size:13px;color:#6b6b67;text-align:right;">${formatAmount(d.taxAmount, d.currency)}</td>
                </tr>
                <tr style="border-top:2px solid #1a1a18;">
                  <td style="padding:10px 12px 4px;font-size:15px;font-weight:700;color:#1a1a18;">Total due</td>
                  <td style="padding:10px 12px 4px;font-size:15px;font-weight:700;color:#1D9E75;text-align:right;">${formatAmount(d.grand, d.currency)}</td>
                </tr>
              </table>

              ${bankSection}

              <!-- Attachment note -->
              <div style="margin-top:24px;padding:12px 16px;background:#E1F5EE;border-radius:8px;">
                <p style="margin:0;font-size:13px;color:#085041;">📎 The full invoice PDF is attached to this email.</p>
              </div>

            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9e9e99;">Sent with <strong style="color:#1D9E75;">RenewDesk</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body: SendInvoiceRequest = await req.json()
    const { invoiceData, recipientEmail, pdfBase64 } = body

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
    }
    if (!pdfBase64) {
      return NextResponse.json({ error: 'pdfBase64 is required' }, { status: 400 })
    }

    const subject = `Invoice ${invoiceData.invNumber} from ${invoiceData.bizName || 'us'}`
    const html = buildEmailHtml(invoiceData, recipientEmail)
    const filename = `INV-${invoiceData.invNumber}-${invoiceData.clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@resend.dev',
      to: [recipientEmail],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('send-invoice route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}
