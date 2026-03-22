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
    <div className="flex gap-1.5 border-b border-border pb-px overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono font-medium rounded-t-md transition-all whitespace-nowrap',
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
