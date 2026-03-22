'use client'

import { useEffect, useState } from 'react'

// ============================================================
// CONFIDENCE METER (P5-13)
// SVG circular gauge with animated fill and color transitions
// ============================================================

interface ConfidenceMeterProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

function getColor(value: number): string {
  if (value < 30) return '#ef4444'  // red-500
  if (value < 60) return '#f97316'  // orange-500
  return '#22c55e'                   // green-500
}

function getTrailColor(value: number): string {
  if (value < 30) return 'rgba(239, 68, 68, 0.15)'
  if (value < 60) return 'rgba(249, 115, 22, 0.15)'
  return 'rgba(34, 197, 94, 0.15)'
}

export function ConfidenceMeter({
  value,
  size = 80,
  strokeWidth = 6,
  label,
  className = '',
}: ConfidenceMeterProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const clampedValue = Math.min(100, Math.max(0, value))

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(clampedValue), 50)
    return () => clearTimeout(timer)
  }, [clampedValue])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedValue / 100) * circumference
  const center = size / 2
  const color = getColor(clampedValue)
  const trailColor = getTrailColor(clampedValue)

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          role="img"
          aria-label={`Confidence: ${clampedValue}%`}
        >
          {/* Trail circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trailColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold font-mono"
            style={{ color, fontSize: size * 0.22 }}
          >
            {Math.round(clampedValue)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[10px] text-text-dim font-mono font-semibold">{label}</span>
      )}
    </div>
  )
}

/** Compact inline confidence bar for rule cards */
export function ConfidenceBar({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  const clampedValue = Math.min(100, Math.max(0, value))
  const color = getColor(clampedValue)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-void rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-700"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span
        className="text-[10px] font-bold font-mono"
        style={{ color }}
      >
        {Math.round(clampedValue)}%
      </span>
    </div>
  )
}
