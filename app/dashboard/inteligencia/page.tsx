'use client'

import { useState } from 'react'
import { Brain, MessageSquare, GraduationCap, Star } from 'lucide-react'
import { useOrg } from '@/lib/org-context'
import { ProactiveQueuePanel } from '@/components/proactive-queue-panel'
import { CoachingTipsPanel } from '@/components/coaching-tips-panel'
import { ReviewRequestsPanel } from '@/components/review-requests-panel'
import { SofiaLearningsPanel } from '@/components/sofia-learnings-panel'

type Tab = 'proactive' | 'coaching' | 'reviews' | 'learnings'

const TABS: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: 'proactive', label: 'Cola proactiva', icon: MessageSquare },
  { id: 'coaching', label: 'Coaching', icon: GraduationCap },
  { id: 'reviews', label: 'Reseñas', icon: Star },
  { id: 'learnings', label: 'Aprendizajes', icon: Brain },
]

export default function InteligenciaPage() {
  const { orgId } = useOrg()
  const [active, setActive] = useState<Tab>('proactive')

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div>
        <h1 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary flex items-center gap-2">
          <Brain size={14} className="text-brand-purple" strokeWidth={1.8} />
          Cerebro de SofIA
        </h1>
        <p className="text-[11px] font-body text-text-dim mt-0.5">
          Lo que SofIA quiere hacer y los patrones que aprende de tu clínica
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-4 border-b border-brand-purple/10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
              active === t.id
                ? 'text-brand-purple border-brand-purple'
                : 'text-text-dim border-transparent hover:text-text-muted'
            }`}
          >
            <t.icon size={11} strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {active === 'proactive' && <ProactiveQueuePanel orgId={orgId} />}
      {active === 'coaching' && <CoachingTipsPanel orgId={orgId} />}
      {active === 'reviews' && <ReviewRequestsPanel orgId={orgId} />}
      {active === 'learnings' && <SofiaLearningsPanel orgId={orgId} />}
    </div>
  )
}
