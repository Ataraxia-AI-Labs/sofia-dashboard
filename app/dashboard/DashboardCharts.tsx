'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'

export function IntentsChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#7E7A8E', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#101018', border: '1px solid #1C1C2A', borderRadius: '12px', fontSize: '12px' }}
          labelStyle={{ color: '#F0EEF5' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#8B5CF6' : `rgba(139, 92, 246, ${0.8 - i * 0.08})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Re-export PieChart for future use
export { PieChart, Pie }
