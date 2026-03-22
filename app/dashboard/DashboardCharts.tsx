'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export function IntentsChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#4A4862', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0C0C14', border: '1px solid #1A1A2E', borderRadius: '6px', fontSize: '10px', fontFamily: 'monospace' }}
          labelStyle={{ color: '#E0DCF0' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#8B5CF6' : `rgba(139, 92, 246, ${0.8 - i * 0.08})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
