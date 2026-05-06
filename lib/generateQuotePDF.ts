import jsPDF from 'jspdf'
import type { Quote, Profile } from './types'

// ─── PDF-safe currency formatting ────────────────────────────────────────────

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

// ─── Data interface ───────────────────────────────────────────────────────────

export interface QuotePDFData {
  quoteNumber: string
  bizName: string
  bizEmail: string
  clientName: string
  contactName?: string
  clientEmail?: string
  serviceName?: string
  servicePlan?: string
  validUntil?: string
  currency: string
  taxRate: number
  items: Array<{ desc: string; qty: number; price: number }>
  subtotal: number
  taxAmount: number
  grand: number
  /** 'approved' or 'converted' shows green Approved badge; otherwise blue Pending approval */
  status?: string
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateQuotePDF(data: QuotePDFData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 20
  const pageWidth = 210
  const rightEdge = pageWidth - margin

  const isApproved = data.status === 'approved' || data.status === 'converted'

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const validUntilFmt = data.validUntil
    ? new Date(data.validUntil + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

  let y = margin

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(59, 130, 246) // #3B82F6 blue
  doc.text('Quote', margin, y + 8)

  const svcLabel = [data.serviceName, data.servicePlan].filter(Boolean).join(' - ')
  if (svcLabel) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 107, 103)
    doc.text(svcLabel, margin, y + 15)
  }

  // Business info — right aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(26, 26, 24)
  doc.text(data.bizName || 'Your Business', rightEdge, y + 6, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 107, 103)
  if (data.bizEmail) doc.text(data.bizEmail, rightEdge, y + 12, { align: 'right' })
  doc.text(data.quoteNumber, rightEdge, y + 19, { align: 'right' })
  doc.text(`Issued: ${today}`, rightEdge, y + 25, { align: 'right' })
  doc.text(`Valid until: ${validUntilFmt}`, rightEdge, y + 31, { align: 'right' })

  // Status badge
  const badgeY = y + 39
  if (isApproved) {
    doc.setFillColor(225, 245, 238)   // #E1F5EE green
    doc.roundedRect(rightEdge - 46, badgeY - 4, 46, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(8, 80, 65)       // #085041
    doc.text('Approved', rightEdge - 23, badgeY + 0.5, { align: 'center' })
  } else {
    doc.setFillColor(239, 246, 255)   // #EFF6FF blue
    doc.roundedRect(rightEdge - 62, badgeY - 4, 62, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(29, 78, 216)     // #1D4ED8
    doc.text('Pending approval', rightEdge - 31, badgeY + 0.5, { align: 'center' })
  }

  y += 48

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, y, rightEdge, y)
  y += 7

  // ── From / Quote To ───────────────────────────────────────────────────────────
  const halfX = margin + (rightEdge - margin) / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text('FROM', margin, y)
  doc.text('QUOTE TO', halfX, y)

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
  const colQty  = margin + 100
  const colUnit = margin + 130
  const colAmt  = rightEdge

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text('DESCRIPTION', colDesc, y)
  doc.text('QTY',         colQty,  y, { align: 'center' })
  doc.text('UNIT PRICE',  colUnit, y, { align: 'right' })
  doc.text('AMOUNT',      colAmt,  y, { align: 'right' })

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
    const truncated =
      doc.getTextWidth(descText) > maxDescWidth
        ? doc.splitTextToSize(descText, maxDescWidth)[0] + '...'
        : descText

    doc.text(truncated, colDesc, y)
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
  doc.text('Quote total', totalsLabelX, y)
  doc.text(pdfAmount(data.grand, data.currency), colAmt, y, { align: 'right' })

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text(
    data.validUntil
      ? `Generated with RenewDesk by Barastreams · This quote is valid until ${validUntilFmt}.`
      : 'Generated with RenewDesk by Barastreams',
    margin,
    282
  )

  return doc
}

// ─── Convenience: build QuotePDFData from a saved Quote + Profile ─────────────

export function quoteToPDFData(quote: Quote, profile: Profile | null): QuotePDFData {
  return {
    quoteNumber: quote.quote_number,
    bizName:     profile?.business_name ?? '',
    bizEmail:    profile?.business_email ?? '',
    clientName:  quote.client_name,
    contactName: quote.contact_name ?? undefined,
    clientEmail: quote.client_email ?? undefined,
    serviceName: quote.service_name ?? undefined,
    servicePlan: quote.service_plan ?? undefined,
    validUntil:  quote.valid_until ?? undefined,
    currency:    quote.currency ?? 'NGN',
    taxRate:     quote.tax_rate,
    items: Array.isArray(quote.line_items)
      ? quote.line_items.map((i) => ({
          desc:  String((i as { desc?: string }).desc  || 'Item'),
          qty:   Number((i as { qty?: number }).qty)   || 1,
          price: Number((i as { price?: number }).price) || 0,
        }))
      : [],
    subtotal:  quote.subtotal,
    taxAmount: quote.tax_amount,
    grand:     quote.total,
    status:    quote.status,
  }
}
