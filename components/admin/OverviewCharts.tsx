'use client'

import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

export interface MonthlyPoint {
  month: string
  count?: number
  invoices?: number
  quotes?: number
  value?: number
}

export interface StatusPoint {
  name: string
  value: number
  color: string
}

interface Props {
  userGrowth: MonthlyPoint[]
  invoiceVolume: MonthlyPoint[]
  revenue: MonthlyPoint[]
  statusBreakdown: StatusPoint[]
}

const CARD = { background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '20px 16px' }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={CARD}>
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

const TICK_STYLE = { fill: '#9ca3af', fontSize: 11 }

function fmtVal(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k'
  return String(v)
}

const CUSTOM_TOOLTIP_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={CUSTOM_TOOLTIP_STYLE}>
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value >= 100 ? fmtVal(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const RADIAN = Math.PI / 180
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (!percent || percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function OverviewCharts({ userGrowth, invoiceVolume, revenue, statusBreakdown }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* User growth */}
      <ChartCard title="User Growth (cumulative)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={userGrowth} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="month" tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtVal} />
            <Tooltip content={<TooltipBox />} />
            <Line type="monotone" dataKey="count" name="Users" stroke="#1D9E75" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Invoice + quote volume */}
      <ChartCard title="Monthly Volume (Invoices vs Quotes)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={invoiceVolume} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="month" tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipBox />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="invoices" name="Invoices" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            <Bar dataKey="quotes"   name="Quotes"   fill="#0F6E56" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue */}
      <ChartCard title="Revenue Processed (value billed)">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenue} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="month" tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtVal} />
            <Tooltip content={<TooltipBox />} />
            <Area type="monotone" dataKey="value" name="Value" stroke="#1D9E75" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Status breakdown */}
      <ChartCard title="Invoice Status Breakdown">
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
              >
                {statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 flex-1">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-gray-600 capitalize">{s.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
