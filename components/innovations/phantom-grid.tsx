'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'

interface PhantomSection {
  id: string
  priority: number
  element: ReactNode
}

interface PhantomGridProps {
  sections: PhantomSection[]
  className?: string
}

const STORAGE_KEY = 'sofia_phantom_grid_usage'

interface UsageMap {
  [sectionId: string]: { views: number; lastInteraction: number }
}

function getUsage(): UsageMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveUsage(usage: UsageMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Phantom Grid — Adaptive layout that learns.
 * Tracks which sections the user interacts with most
 * and reorders them to put highest-usage first.
 * Falls back to default priority if no usage data.
 */
function sortSections(sections: PhantomSection[]): PhantomSection[] {
  const usage = getUsage()
  return [...sections].sort((a, b) => {
    const usageA = usage[a.id]?.views || 0
    const usageB = usage[b.id]?.views || 0
    if (usageA > 0 || usageB > 0) {
      if (usageA !== usageB) return usageB - usageA
    }
    return a.priority - b.priority
  })
}

export function PhantomGrid({ sections, className = '' }: PhantomGridProps) {
  // Sort on first render (no useEffect delay) to prevent layout shift
  const [orderedSections, setOrderedSections] = useState(() => sortSections(sections))

  // Re-sort when sections change (e.g., voice data arrives)
  useEffect(() => {
    setOrderedSections(sortSections(sections))
  }, [sections])

  // Track views — increment when section becomes visible
  const trackView = useCallback((sectionId: string) => {
    const usage = getUsage()
    const current = usage[sectionId] || { views: 0, lastInteraction: 0 }
    usage[sectionId] = {
      views: current.views + 1,
      lastInteraction: Date.now(),
    }
    saveUsage(usage)
  }, [])

  // Decay old entries (> 30 days) on mount
  useEffect(() => {
    const usage = getUsage()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    let changed = false
    for (const key of Object.keys(usage)) {
      if (usage[key].lastInteraction < thirtyDaysAgo) {
        delete usage[key]
        changed = true
      }
    }
    if (changed) saveUsage(usage)
  }, [])

  return (
    <div className={className}>
      {orderedSections.map((section) => (
        <div
          key={section.id}
          onMouseEnter={() => trackView(section.id)}
          onTouchStart={() => trackView(section.id)}
        >
          {section.element}
        </div>
      ))}
    </div>
  )
}
