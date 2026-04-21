'use client'

import { AtaraxiaLogo } from '@/components/ataraxia-logo'

interface WelcomeStateProps {
  userName?: string
  orgName?: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Madrugada tranquila'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function WelcomeState({ userName, orgName }: WelcomeStateProps) {
  const greeting = getGreeting()
  const displayName = userName?.split(' ')[0] || 'Doctor'

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4">
        <AtaraxiaLogo size={56} trackMouse />
      </div>

      <h1 className="text-[24px] md:text-[26px] font-display font-medium text-text-primary tracking-tight leading-[1.1] mb-1.5">
        {greeting}, <span className="text-brand-purple">{displayName}</span>
      </h1>

      <p className="text-[12.5px] font-body text-text-dim max-w-[420px]">
        {orgName ? `${orgName} está pensando contigo. Pregúntale.` : 'Tu clínica está pensando contigo. Pregúntale.'}
      </p>
    </div>
  )
}
