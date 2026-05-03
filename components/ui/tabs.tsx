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

/**
 * S136/S137 Hyprland-style vertical rail for pages with many sections (Ajustes).
 *
 * Glass-blur capsule with violet hairlines, hosts a list of icon+label
 * rows — every section visible at once, every label readable without
 * hovering. The capsule sits to the right of the content (table-of-
 * contents pattern) so it doesn't visually compete with the global
 * sidebar on the left.
 *
 * Active row: brand-purple icon + label, dot indicator on the inner
 * edge, soft violet glow. Inactive rows: text-muted, hover lifts to
 * text-primary with a small translate.
 *
 * A11Y: WAI-ARIA tablist with aria-orientation="vertical" + roving
 * tabindex (only the active tab is keyboard-focusable; ArrowUp/Down +
 * Home/End move the active state).
 */
export function TabsVerticalRail({ tabs, activeTab, onChange }: TabsProps) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const idx = tabs.findIndex((t) => t.id === activeTab)
    let next = idx
    if (e.key === 'ArrowDown') next = (idx + 1) % tabs.length
    if (e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = tabs.length - 1
    onChange(tabs[next].id)
  }

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label="Secciones de ajustes"
      onKeyDown={onKeyDown}
      className="relative flex flex-col items-stretch gap-1 p-2 rounded-2xl w-[208px] flex-shrink-0 self-start"
      style={{
        background:
          'linear-gradient(180deg, rgb(var(--color-surface-rgb) / 0.42) 0%, rgb(var(--color-surface-2-rgb) / 0.28) 100%)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        boxShadow:
          '0 0 0 1px rgba(139,92,246,0.14), 0 1px 0 0 rgba(255,255,255,0.06) inset, 0 18px 40px -12px rgba(0,0,0,0.55), 0 0 28px -6px rgba(139,92,246,0.18)',
      }}
    >
      {/* Hyprland hairlines — same accent the sidebar uses. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.45), transparent)' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.22), transparent)' }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[12px] font-body transition-all duration-150 ease-out active:scale-[0.985]',
              isActive
                ? 'text-brand-purple bg-brand-purple/8 font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-2/40 hover:translate-x-[1px]',
            )}
          >
            {Icon && (
              <span className={clsx('flex-shrink-0', isActive && 'drop-shadow-[0_0_4px_rgba(139,92,246,0.45)]')}>
                <Icon size={13} strokeWidth={isActive ? 2 : 1.6} aria-hidden="true" />
              </span>
            )}
            <span className="truncate">{tab.label}</span>
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-brand-purple rounded-full shadow-[0_0_5px_rgba(139,92,246,0.7)]"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  // S120-A11Y-011: WAI-ARIA tablist semantics so screen readers announce
  // the strip as a tab group and the active tab as selected. Used by the
  // 12-tab Ajustes section among others.
  return (
    <div
      role="tablist"
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
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
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
