'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface GrowthPoint {
  date: string
  patients: number
  interactions: number
  appointments: number
}

export default function GrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradInteractions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPatients" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradAppointments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7E7A8E' }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#101018', border: '1px solid #1C1C2A', borderRadius: '12px', fontSize: '11px' }}
          labelStyle={{ color: '#F0EEF5' }}
        />
        <Area type="monotone" dataKey="interactions" name="Interacciones" stroke="#8B5CF6" fill="url(#gradInteractions)" strokeWidth={2} />
        <Area type="monotone" dataKey="appointments" name="Citas" stroke="#3B82F6" fill="url(#gradAppointments)" strokeWidth={2} />
        <Area type="monotone" dataKey="patients" name="Pacientes" stroke="#06D6A0" fill="url(#gradPatients)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
