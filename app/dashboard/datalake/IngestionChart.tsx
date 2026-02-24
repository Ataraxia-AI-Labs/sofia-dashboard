'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function IngestionChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="dlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2A" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#4E4A5E', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d: string) => {
            const parts = d.split('-')
            return `${parts[2]}/${parts[1]}`
          }}
          interval={Math.max(Math.floor(data.length / 7) - 1, 0)}
        />
        <YAxis
          tick={{ fill: '#4E4A5E', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: '#101018', border: '1px solid #1C1C2A', borderRadius: '12px', fontSize: '12px' }}
          labelStyle={{ color: '#F0EEF5' }}
          labelFormatter={(d: string) => {
            const date = new Date(d + 'T12:00:00')
            return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
          }}
          formatter={(value: number) => [`${value} samples`, 'Ingesta']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8B5CF6"
          strokeWidth={2}
          fill="url(#dlGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
