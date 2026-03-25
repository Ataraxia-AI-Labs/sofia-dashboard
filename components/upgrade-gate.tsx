'use client'

import { Lock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useOrg } from '@/lib/org-context'
import { getNextPlan, PLAN_DISPLAY_NAMES } from '@/lib/plan-features'
import type { PlanTier } from '@/lib/plan-features'

interface UpgradeGateProps {
  minPlan?: PlanTier | null
  featureName: string
}

/**
 * Full-page upgrade prompt shown when a user's plan
 * doesn't include the feature for the current page.
 */
export function UpgradeGate({ minPlan, featureName }: UpgradeGateProps) {
  const { org } = useOrg()
  const targetPlan = minPlan || getNextPlan(org.plan) || 'PRO'
  const targetName = PLAN_DISPLAY_NAMES[targetPlan]
  const currentName = PLAN_DISPLAY_NAMES[org.plan]

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
          <Lock size={28} className="text-brand-purple" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-mono font-semibold text-text-primary tracking-tight">
            {featureName}
          </h2>
          <p className="text-sm font-mono text-text-muted leading-relaxed">
            Esta funcionalidad requiere el plan{' '}
            <span className="text-brand-purple font-semibold">{targetName}</span>.
            Tu plan actual es{' '}
            <span className="text-text-primary font-medium">{currentName}</span>.
          </p>
        </div>

        <Link
          href="/dashboard/planes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-purple text-white text-xs font-mono font-medium tracking-wide hover:bg-brand-purple/90 transition-colors"
        >
          Ver planes
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  )
}
