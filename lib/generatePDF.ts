import jsPDF from 'jspdf'
import type { Invoice, Profile } from './types'

// ─── PDF-safe currency formatting ────────────────────────────────────────────
// jsPDF's built-in Helvetica cannot render Unicode symbols like ₦, £, €, etc.
// For PDF output only, we use ASCII-safe currency code prefixes.

const PDF_CURRENCY_PREFIX: Record<string, string> = {
  NGN: 'NGN ',
  USD: 'USD ',
  GBP: 'GBP ',
  EUR: 'EUR ',
  KES: 'KES ',
  GHS: 'GHS ',
  ZAR: 'ZAR ',
}

function pdfAmount(amount: number, currency: string): string {
  const prefix = PDF_CURRENCY_PREFIX[currency] ?? `${currency} `
  return prefix + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ─── Number to words ─────────────────────────────────────────────────────────

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below1000(n % 100) : '')
}

function convertToWords(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  if (n >= 1_000_000_000) { parts.push(below1000(Math.floor(n / 1_000_000_000)) + ' Billion'); n %= 1_000_000_000 }
  if (n >= 1_000_000)     { parts.push(below1000(Math.floor(n / 1_000_000)) + ' Million');     n %= 1_000_000 }
  if (n >= 1_000)         { parts.push(below1000(Math.floor(n / 1_000)) + ' Thousand');        n %= 1_000 }
  if (n > 0) parts.push(below1000(n))
  return parts.join(' ')
}

// [singular-main, plural-main, singular-sub, plural-sub]
const CURRENCY_WORDS: Record<string, [string, string, string, string]> = {
  NGN: ['Naira', 'Naira', 'Kobo', 'Kobo'],
  USD: ['Dollar', 'Dollars', 'Cent', 'Cents'],
  GBP: ['Pound', 'Pounds', 'Penny', 'Pence'],
  EUR: ['Euro', 'Euros', 'Cent', 'Cents'],
  KES: ['Shilling', 'Shillings', 'Cent', 'Cents'],
  GHS: ['Cedi', 'Cedis', 'Pesewa', 'Pesewas'],
  ZAR: ['Rand', 'Rand', 'Cent', 'Cents'],
}

function numberToWords(amount: number, currency: string): string {
  const [ms, mp, ss, sp] = CURRENCY_WORDS[currency] ?? ['Unit', 'Units', 'Cent', 'Cents']
  const rounded = Math.round(amount * 100)
  const mainAmt = Math.floor(rounded / 100)
  const subAmt  = rounded % 100
  const mainStr = `${convertToWords(mainAmt)} ${mainAmt === 1 ? ms : mp}`
  if (subAmt === 0) return `${mainStr} Only`
  return `${mainStr} and ${convertToWords(subAmt)} ${subAmt === 1 ? ss : sp} Only`
}

// ─── Logo loader (browser-only) ───────────────────────────────────────────────

function getImageFormat(dataUrl: string): string {
  const m = dataUrl.match(/^data:image\/(\w+);/)
  const t = m?.[1]?.toLowerCase()
  if (t === 'jpeg' || t === 'jpg') return 'JPEG'
  if (t === 'png') return 'PNG'
  if (t === 'gif') return 'GIF'
  if (t === 'webp') return 'WEBP'
  return 'JPEG'
}

export async function fetchLogoDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror   = () => resolve(undefined as unknown as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

// ─── Data interface ───────────────────────────────────────────────────────────

export interface InvoicePDFData {
  /** When true the footer branding is suppressed (Pro/Agency with remove_branding). */
  removeBranding?: boolean
  invNumber: string
  bizName: string
  bizEmail: string
  clientName: string
  contactName?: string
  clientEmail?: string
  serviceName?: string
  servicePlan?: string
  renewalDate?: string
  currency: string
  taxRate: number
  items: Array<{ desc: string; qty: number; price: number }>
  subtotal: number
  taxAmount: number
  grand: number
  bankName?: string
  accountName?: string
  accountNumber?: string
  bankCountry?: string
  swiftCode?: string
  iban?: string
  /** When 'paid': heading becomes "Receipt", total label becomes "Total paid",
   *  badge turns green. Omit or leave undefined for normal invoice rendering. */
  status?: string
  /** ISO timestamp for when the invoice was paid. Used as the "Payment date"
   *  on receipts. Falls back to updated_at when null. */
  paymentDate?: string
  /** Optional notes shown at the bottom of the invoice. */
  notes?: string
  /** Base64 data URL of the business logo, pre-fetched by the caller. */
  logoDataUrl?: string
  /** Set when generating a receipt for one specific payment instalment. */
  amountThisPayment?: number
  /** Running total paid across all instalments (including this one). */
  totalAmountPaid?: number
  /** Amount still outstanding after this payment. */
  balanceRemaining?: number
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generatePDF(data: InvoicePDFData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 20
  const pageWidth = 210
  const rightEdge = pageWidth - margin

  const isPaid = data.status === 'paid'
  // A receipt generated for one specific payment instalment
  const isPaymentReceipt = typeof data.amountThisPayment === 'number'
  const isFullPayment = isPaymentReceipt && (data.balanceRemaining ?? 0) <= 0.001

  const heading = (isPaid || isPaymentReceipt) ? 'Receipt' : 'Invoice'
  const numberLabel = (isPaid || isPaymentReceipt) ? 'Receipt No.' : 'Invoice No.'
  const totalLabel = isPaid || isFullPayment ? 'Total paid' : 'Total due'
  const dateLabel = (isPaid || isPaymentReceipt) ? 'Payment date' : 'Due'

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  let bottomDateText: string
  if (isPaid || isPaymentReceipt) {
    const paid = data.paymentDate ? new Date(data.paymentDate) : null
    bottomDateText = paid
      ? paid.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : today
  } else {
    bottomDateText = data.renewalDate
      ? new Date(data.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Upon renewal'
  }

  let y = margin

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(29, 158, 117) // #1D9E75
  doc.text(heading, margin, y + 8)

  const svcLabel = [data.serviceName, data.servicePlan].filter(Boolean).join(' - ')
  if (svcLabel) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 107, 103)
    doc.text(svcLabel, margin, y + 15)
  }

  // Logo (right-aligned, max 36mm wide × 14mm tall)
  const LOGO_W = 36
  const LOGO_H = 14
  let logoOffset = 0
  if (data.logoDataUrl) {
    try {
      const fmt = getImageFormat(data.logoDataUrl)
      doc.addImage(data.logoDataUrl, fmt, rightEdge - LOGO_W, y, LOGO_W, LOGO_H)
      logoOffset = LOGO_H + 3
    } catch { /* ignore logo errors */ }
  }

  // Business info — right aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(26, 26, 24)
  doc.text(data.bizName || 'Your Business', rightEdge, y + 6 + logoOffset, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 107, 103)
  if (data.bizEmail) doc.text(data.bizEmail, rightEdge, y + 12 + logoOffset, { align: 'right' })
  doc.text(`${numberLabel} ${data.invNumber}`, rightEdge, y + 19 + logoOffset, { align: 'right' })
  doc.text(`Issued: ${today}`, rightEdge, y + 25 + logoOffset, { align: 'right' })
  doc.text(`${dateLabel}: ${bottomDateText}`, rightEdge, y + 31 + logoOffset, { align: 'right' })

  // Status badge
  const badgeY = y + 39 + logoOffset
  if (isPaid || isFullPayment) {
    doc.setFillColor(225, 245, 238)   // #E1F5EE
    doc.roundedRect(rightEdge - 56, badgeY - 4, 56, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(8, 80, 65)       // #085041
    doc.text('Payment Received', rightEdge - 28, badgeY + 0.5, { align: 'center' })
  } else if (isPaymentReceipt) {
    doc.setFillColor(224, 242, 254)   // #E0F2FE sky-100
    doc.roundedRect(rightEdge - 52, badgeY - 4, 52, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(3, 105, 161)     // #0369A1 sky-700
    doc.text('Part Payment', rightEdge - 26, badgeY + 0.5, { align: 'center' })
  } else {
    doc.setFillColor(254, 243, 199)   // #FEF3C7
    doc.roundedRect(rightEdge - 52, badgeY - 4, 52, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(146, 64, 14)     // #92400E
    doc.text('Pending payment', rightEdge - 26, badgeY + 0.5, { align: 'center' })
  }

  y += 48 + logoOffset

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, rightEdge, y)
  y += 7

  // ── From / Bill To ───────────────────────────────────────────────────────────
  const halfX = margin + (rightEdge - margin) / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text('FROM', margin, y)
  doc.text('BILL TO', halfX, y)

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(26, 26, 24)

  doc.text(data.bizName || 'Your Business', margin, y)
  if (data.bizEmail) doc.text(data.bizEmail, margin, y + 5)

  doc.text(data.clientName || 'Client', halfX, y)
  let billY = y + 5
  if (data.contactName) {
    doc.text(data.contactName, halfX, billY)
    billY += 5
  }
  if (data.clientEmail) {
    doc.text(data.clientEmail, halfX, billY)
    billY += 5
  }

  y += 18

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, rightEdge, y)
  y += 7

  // ── Table header ─────────────────────────────────────────────────────────────
  const colDesc = margin
  const colQty = margin + 100
  const colUnit = margin + 130
  const colAmt = rightEdge

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text('DESCRIPTION', colDesc, y)
  doc.text('QTY', colQty, y, { align: 'center' })
  doc.text('UNIT PRICE', colUnit, y, { align: 'right' })
  doc.text('AMOUNT', colAmt, y, { align: 'right' })

  y += 3
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, rightEdge, y)
  y += 5

  // ── Table rows ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(26, 26, 24)

  data.items.forEach((item) => {
    const descText = item.desc || 'Item'
    const maxDescWidth = 85
    const truncatedDesc =
      doc.getTextWidth(descText) > maxDescWidth
        ? doc.splitTextToSize(descText, maxDescWidth)[0] + '...'
        : descText

    doc.text(truncatedDesc, colDesc, y)
    doc.text(String(item.qty), colQty, y, { align: 'center' })
    doc.text(pdfAmount(item.price, data.currency), colUnit, y, { align: 'right' })
    doc.text(pdfAmount(item.qty * item.price, data.currency), colAmt, y, { align: 'right' })
    y += 7
    doc.setDrawColor(220, 220, 218)
    doc.setLineWidth(0.15)
    doc.line(margin, y - 1.5, rightEdge, y - 1.5)
  })

  y += 4

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalsLabelX = colUnit - 30

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 107, 103)
  doc.text('Subtotal', totalsLabelX, y)
  doc.text(pdfAmount(data.subtotal, data.currency), colAmt, y, { align: 'right' })
  y += 6
  doc.text(`Tax (${data.taxRate}%)`, totalsLabelX, y)
  doc.text(pdfAmount(data.taxAmount, data.currency), colAmt, y, { align: 'right' })
  y += 4

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(totalsLabelX, y, colAmt, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 26, 24)
  doc.text(totalLabel, totalsLabelX, y)
  doc.text(pdfAmount(data.grand, data.currency), colAmt, y, { align: 'right' })
  y += 6

  // Total in words
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(107, 107, 103)
  doc.text(numberToWords(data.grand, data.currency), totalsLabelX, y)
  y += 10

  // ── Payment details ───────────────────────────────────────────────────────────
  const hasBankDetails = data.bankName || data.accountName || data.accountNumber
  if (hasBankDetails) {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margin, y, rightEdge, y)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(158, 158, 153)
    doc.text('PAYMENT DETAILS', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 24)

    if (data.bankName) {
      doc.text(`Bank: ${data.bankName}`, margin, y)
      y += 5
    }
    if (data.accountName) {
      doc.text(`Account name: ${data.accountName}`, margin, y)
      y += 5
    }
    if (data.accountNumber) {
      doc.text(`Account number: ${data.accountNumber}`, margin, y)
      y += 5
    }
    if (data.swiftCode) {
      doc.text(`SWIFT/BIC: ${data.swiftCode}`, margin, y)
      y += 5
    }
    if (data.iban) {
      doc.text(`IBAN: ${data.iban}`, margin, y)
      y += 5
    }
  }

  // ── Payment summary (partial / instalment receipts) ──────────────────────────
  const hasPaymentSummary = data.amountThisPayment !== undefined || (data.totalAmountPaid !== undefined && (data.totalAmountPaid ?? 0) > 0)
  if (hasPaymentSummary) {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margin, y, rightEdge, y)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(158, 158, 153)
    doc.text('PAYMENT SUMMARY', margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setTextColor(26, 26, 24)

    if (data.amountThisPayment !== undefined) {
      doc.setFont('helvetica', 'normal')
      doc.text('This payment:', margin, y)
      doc.text(pdfAmount(data.amountThisPayment, data.currency), rightEdge, y, { align: 'right' })
      y += 6
    }

    if (data.totalAmountPaid !== undefined) {
      doc.setFont('helvetica', 'normal')
      doc.text('Total paid:', margin, y)
      doc.text(pdfAmount(data.totalAmountPaid, data.currency), rightEdge, y, { align: 'right' })
      y += 6
    }

    if (data.balanceRemaining !== undefined) {
      const bal = Math.max(0, data.balanceRemaining)
      doc.setFont('helvetica', 'bold')
      if (bal > 0) {
        doc.setTextColor(146, 64, 14)   // amber — balance outstanding
        doc.text('Balance remaining:', margin, y)
        doc.text(pdfAmount(bal, data.currency), rightEdge, y, { align: 'right' })
      } else {
        doc.setTextColor(29, 158, 117)  // brand green — fully paid
        doc.text('Balance remaining:', margin, y)
        doc.text(pdfAmount(0, data.currency), rightEdge, y, { align: 'right' })
      }
      doc.setTextColor(26, 26, 24)
      doc.setFont('helvetica', 'normal')
      y += 8
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margin, y, rightEdge, y)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(158, 158, 153)
    doc.text('NOTES', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 24)
    const noteLines = doc.splitTextToSize(data.notes, rightEdge - margin)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 5
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  if (!data.removeBranding) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(158, 158, 153)
    doc.text(
      isPaid
        ? 'Generated with RenewDesk by Barastreams · renewdeskapp.com · Thank you for your payment.'
        : 'Generated with RenewDesk by Barastreams · renewdeskapp.com · Thank you for your business.',
      margin,
      282
    )
  }

  return doc
}

// ─── Convenience: build InvoicePDFData from a saved Invoice + Profile ────────

export function invoiceToPDFData(
  invoice: Invoice,
  profile: Profile | null,
  logoDataUrl?: string,
  paymentOverride?: {
    amountThisPayment?: number
    totalAmountPaid?: number
    balanceRemaining?: number
    paymentDate?: string
  }
): InvoicePDFData {
  const inv = invoice as Invoice & { payment_date?: string | null }
  const snap = invoice.bank_details_snapshot

  // Always read bank details from the snapshot when available.
  // Fall back to profile for old invoices created before this feature.
  const bankName = snap?.bank_name ?? profile?.bank_name ?? undefined
  const accountName = snap?.account_name ?? profile?.account_name ?? undefined
  const accountNumber = snap?.account_number ?? profile?.account_number ?? undefined
  const bankCountry = snap?.bank_country ?? profile?.bank_country ?? undefined
  const swiftCode = snap?.swift_code ?? profile?.swift_code ?? undefined
  const iban = snap?.iban ?? profile?.iban ?? undefined

  return {
    invNumber: invoice.inv_number,
    bizName: profile?.business_name ?? '',
    bizEmail: profile?.business_email ?? '',
    clientName: invoice.client_name,
    contactName: invoice.contact_name ?? undefined,
    clientEmail: invoice.client_email ?? undefined,
    serviceName: invoice.service_name ?? undefined,
    servicePlan: invoice.service_plan ?? undefined,
    renewalDate: invoice.renewal_date ?? undefined,
    currency: invoice.currency ?? 'NGN',
    taxRate: invoice.tax_rate,
    items: Array.isArray(invoice.line_items)
      ? invoice.line_items.map((i) => ({
          desc: String((i as { desc?: string }).desc || 'Item'),
          qty: Number((i as { qty?: number }).qty) || 1,
          price: Number((i as { price?: number }).price) || 0,
        }))
      : [],
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    grand: invoice.total,
    bankName,
    accountName,
    accountNumber,
    bankCountry,
    swiftCode,
    iban,
    status: invoice.status,
    paymentDate: inv.payment_date ?? invoice.updated_at ?? undefined,
    notes: invoice.notes ?? undefined,
    logoDataUrl,
    // For partial invoices with no specific payment context, show running totals
    ...(invoice.status === 'partial' ? {
      totalAmountPaid: invoice.amount_paid,
      balanceRemaining: invoice.total - invoice.amount_paid,
    } : {}),
    // Caller-supplied payment override wins over all defaults
    ...paymentOverride,
  }
}
