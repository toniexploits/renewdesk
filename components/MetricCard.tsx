interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  green?: boolean
}

export default function MetricCard({ label, value, sub, green }: MetricCardProps) {
  return (
    <div
      className="bg-white rounded-xl px-5 py-4"
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-widest text-gray-400"
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold leading-tight ${
          green ? 'text-brand' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
      )}
    </div>
  )
}
