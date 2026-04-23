'use client'

import clsx from 'clsx'

interface Tab {
  id: string
  label: string
  icon?: React.ComponentType<Record<string, unknown>>
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div
      className="flex gap-1.5 border-b border-border/30 pb-px overflow-x-auto scrollbar-thin"
      // Soft gradient fade on both edges hints that the tab strip scrolls
      // when more than ~7 tabs are defined (e.g. Ajustes has 12).
      style={{
        maskImage: 'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 24px), transparent 100%)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => {
              onChange(tab.id)
              // Bring the newly active tab into view so users never
              // lose sight of their selection after scrolling.
              requestAnimationFrame(() => {
                const btn = document.activeElement as HTMLElement | null
                btn?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              })
            }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-[12px] font-body font-medium rounded-t-md transition-all whitespace-nowrap flex-shrink-0',
              isActive
                ? 'bg-surface-2 text-brand-purple border border-border border-b-surface-2 -mb-px'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            {Icon && <Icon size={15} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
