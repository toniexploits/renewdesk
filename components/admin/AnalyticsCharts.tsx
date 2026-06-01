'use client'

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface CurrencyBreakdown {
  name: string
  value: number
  color: string
}

export interface TopUser {
  name: string
  total_value: number
  invoice_count: number
}

export interface DayHeatmapEntry {
  day: string
  count: number
}

interface Props {
  currencyBreakdown: CurrencyBreakdown[]
  topUsers: TopUser[]
  dayHeatmap: DayHeatmapEntry[]
}

const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  padding: '20px 16px',
}

const TICK = { fill: '#9ca3af', fontSize: 11 }

function fmtVal(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k'
  return String(v)
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
}

export default function AnalyticsCharts({ currencyBreakdown, topUsers, dayHeatmap }: Props) {
  return (
    <div className="space-y-4">
      {/* Currency breakdown */}
      <div style={CARD}>
        <p className="text-sm font-semibold text-gray-700 mb-4">Currency Breakdown</p>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={currencyBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value">
                {currencyBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 flex-1">
            {currencyBreakdown.map(e => (
              <div key={e.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                  <span className="text-sm text-gray-600">{e.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top users */}
      <div style={CARD}>
        <p className="text-sm font-semibold text-gray-700 mb-4">Top 5 Users by Value Invoiced</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topUsers} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtVal} />
            <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={80} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [fmtVal(v as number), 'Value']} />
            <Bar dataKey="total_value" name="Value" fill="#1D9E75" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day of week heatmap */}
      <div style={CARD}>
        <p className="text-sm font-semibold text-gray-700 mb-4">Invoices by Day of Week</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dayHeatmap} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="day" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Invoices" fill="#0F6E56" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
