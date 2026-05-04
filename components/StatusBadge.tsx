import type { InvoiceStatus } from '@/lib/types'

const statusStyles: Record<InvoiceStatus, string> = {
  draft: 'bg-[#EFF6FF] text-[#1D4ED8]',
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-[#E1F5EE] text-[#085041]',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}
