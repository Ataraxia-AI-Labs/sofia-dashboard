import React from 'react'

export interface SectionTitleProps {
  icon: React.ReactNode
  title: string
  className?: string
}

export function SectionTitle({ icon, title, className }: SectionTitleProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className || ''}`}>
      <span className="text-brand-purple">{icon}</span>
      <h3 className="text-[11px] font-semibold font-mono text-text-primary uppercase tracking-widest">{title}</h3>
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  )
}
