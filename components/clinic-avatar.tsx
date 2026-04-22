'use client'

import { useState } from 'react'
import type { Organization } from '@/types'
import { Tooltip } from '@/components/ui'

interface ClinicAvatarProps {
  org: Organization | null
  userEmail?: string
  size?: number
}

/**
 * Clinic-branded avatar in the topbar.
 * - Uses the clinic logo (from config_settings.logo_url) when set.
 * - Falls back to the clinic name's initial with a sentient lilac pill.
 * - Does NOT use the user's email initial — this slot is about the *clinic*.
 */
export function ClinicAvatar({ org, userEmail, size = 28 }: ClinicAvatarProps) {
  // Branding tab stores the logo at config_settings.white_label.logo_url
  // (see /dashboard/ajustes/tabs/branding-tab.tsx).
  const whiteLabel = (org?.config_settings?.white_label ?? {}) as Record<string, unknown>
  const logoUrl = typeof whiteLabel.logo_url === 'string'
    ? (whiteLabel.logo_url as string)
    : typeof org?.config_settings?.logo_url === 'string'
      ? (org.config_settings.logo_url as string)
      : undefined
  const [imgErr, setImgErr] = useState(false)

  const initial = (org?.name?.trim()?.[0] || userEmail?.[0] || 'S').toUpperCase()

  // Hyprland naked: no pill/card/bg. Logo when set, otherwise the initial
  // rendered in brand purple — the whole button reads as a floating mark.
  const label = org?.name || 'Clínica'

  if (logoUrl && !imgErr) {
    return (
      <Tooltip label={label} side="left" delay={120}>
        <button
          className="rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.45)] active:scale-[0.9] transition-all duration-150"
          style={{ width: size, height: size }}
          aria-label={label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        </button>
      </Tooltip>
    )
  }

  return (
    <Tooltip label={label} side="left" delay={120}>
      <button
        className="flex items-center justify-center font-mono font-semibold text-brand-purple hover:text-brand-purple-light hover:drop-shadow-[0_0_6px_rgba(139,92,246,0.5)] active:scale-[0.9] transition-all duration-150 cursor-pointer rounded-md"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.42),
        }}
        aria-label={label}
      >
        {initial}
      </button>
    </Tooltip>
  )
}
