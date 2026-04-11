import jsPDF from 'jspdf'
import { formatAmount } from './format'

export interface InvoicePDFData {
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
}

export function generatePDF(data: InvoicePDFData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 20
  const pageWidth = 210
  const rightEdge = pageWidth - margin

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const dueDate = data.renewalDate
    ? new Date(data.renewalDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Upon renewal'

  let y = margin

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(29, 158, 117) // #1D9E75
  doc.text('Invoice', margin, y + 8)

  const svcLabel = [data.serviceName, data.servicePlan].filter(Boolean).join(' — ')
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
  doc.text(data.invNumber, rightEdge, y + 19, { align: 'right' })
  doc.text(`Issued: ${today}`, rightEdge, y + 25, { align: 'right' })
  doc.text(`Due: ${dueDate}`, rightEdge, y + 31, { align: 'right' })

  y += 38

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
    // Truncate long descriptions
    const descText = item.desc || 'Item'
    const maxDescWidth = 85
    const truncatedDesc =
      doc.getTextWidth(descText) > maxDescWidth
        ? doc.splitTextToSize(descText, maxDescWidth)[0] + '…'
        : descText

    doc.text(truncatedDesc, colDesc, y)
    doc.text(String(item.qty), colQty, y, { align: 'center' })
    doc.text(formatAmount(item.price, data.currency), colUnit, y, { align: 'right' })
    doc.text(formatAmount(item.qty * item.price, data.currency), colAmt, y, {
      align: 'right',
    })
    y += 7
    doc.setDrawColor(220, 220, 218)
    doc.setLineWidth(0.15)
    doc.line(margin, y - 1.5, rightEdge, y - 1.5)
  })

  y += 4

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalsLabelX = colUnit - 30

  doc.setFontSize(9)
  doc.setTextColor(107, 107, 103)
  doc.text('Subtotal', totalsLabelX, y)
  doc.text(formatAmount(data.subtotal, data.currency), colAmt, y, { align: 'right' })
  y += 6
  doc.text(`Tax (${data.taxRate}%)`, totalsLabelX, y)
  doc.text(formatAmount(data.taxAmount, data.currency), colAmt, y, { align: 'right' })
  y += 4

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(totalsLabelX, y, colAmt, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 26, 24)
  doc.text('Total due', totalsLabelX, y)
  doc.text(formatAmount(data.grand, data.currency), colAmt, y, { align: 'right' })
  y += 12

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

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(158, 158, 153)
  doc.text('Generated with RenewDesk', margin, 282)

  return doc
}
