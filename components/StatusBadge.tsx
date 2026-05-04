import type { InvoiceStatus, QuoteStatus } from '@/lib/types'

type AnyStatus = InvoiceStatus | QuoteStatus | 'expired'

const statusStyles: Record<AnyStatus, string> = {
  // Invoice
  draft:     'bg-[#EFF6FF] text-[#1D4ED8]',
  pending:   'bg-amber-100 text-amber-800',
  paid:      'bg-[#E1F5EE] text-[#085041]',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  // Quote-only
  sent:      'bg-[#F3F0FF] text-[#5B21B6]',
  approved:  'bg-[#E1F5EE] text-[#085041]',
  converted: 'bg-[#E1F5EE] text-[#085041]',
  expired:   'bg-[#FCEBEB] text-[#791F1F]',
}

const statusLabels: Record<AnyStatus, string> = {
  draft:     'Draft',
  pending:   'Pending',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
  sent:      'Sent',
  approved:  'Approved',
  converted: 'Converted',
  expired:   'Expired',
}

export default function StatusBadge({ status }: { status: AnyStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
