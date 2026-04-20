'use client'

import { useEffect, useRef } from 'react'

interface AtaraxiaLogoProps {
  size?: number
  className?: string
  trackMouse?: boolean
  ambient?: boolean
}

/**
 * Ataraxia IA Labs — brand mark v3 hand-crafted.
 * Colors from the Gemini-render palette (warm silver metal + lilac purple + mint cyan).
 */
export function AtaraxiaLogo({ size = 48, className = '', trackMouse = false, ambient = true }: AtaraxiaLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pupilRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!trackMouse) return
    let raf = 0
    let cx = 0, cy = 0, tx = 0, ty = 0
    const onMove = (e: MouseEvent) => {
      if (!svgRef.current) return
      const r = svgRef.current.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const dist = Math.hypot(dx, dy)
      const falloff = Math.min(dist / 400, 1)
      tx = (dist ? dx / dist : 0) * 2.5 * falloff
      ty = (dist ? dy / dist : 0) * 2.5 * falloff
    }
    const tick = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      if (pupilRef.current) pupilRef.current.setAttribute('transform', `translate(${cx} ${cy})`)
      raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [trackMouse])

  return (
    <svg ref={svgRef} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="araxMetal" x1="15%" y1="10%" x2="85%" y2="95%">
          <stop offset="0%"  stopColor="#f2f2ed" />
          <stop offset="14%" stopColor="#c3c1bd" />
          <stop offset="28%" stopColor="#817d7c" />
          <stop offset="45%" stopColor="#b4b1ad" />
          <stop offset="60%" stopColor="#e9eae4" />
          <stop offset="78%" stopColor="#888685" />
          <stop offset="100%" stopColor="#817d7c" />
        </linearGradient>
        <linearGradient id="araxSpec" x1="20%" y1="0%" x2="70%" y2="50%">
          <stop offset="0%"  stopColor="#fafbf7" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#fafbf7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fafbf7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="araxMetalInner" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%"  stopColor="#d4d2cc" />
          <stop offset="50%" stopColor="#82817e" />
          <stop offset="100%" stopColor="#b9b7b4" />
        </linearGradient>
        <radialGradient id="araxAmbient" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#e1d0f6" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#cbb4e4" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="araxPupil" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="22%"  stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="45%"  stopColor="#adead4" stopOpacity="0.65" />
          <stop offset="72%"  stopColor="#cbb4e4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <filter id="araxGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>

      {ambient && <circle cx="24" cy="24" r="23" fill="url(#araxAmbient)" />}

      <g transform="rotate(45 24 24)">
        <rect x="8" y="8" width="32" height="32" rx="6.5" ry="6.5" fill="none" stroke="url(#araxMetal)" strokeWidth="1.8" />
        <rect x="8" y="8" width="32" height="32" rx="6.5" ry="6.5" fill="none" stroke="url(#araxSpec)" strokeWidth="1.8" opacity="0.9" />
        <rect x="10.2" y="10.2" width="27.6" height="27.6" rx="5.1" ry="5.1" fill="none" stroke="#3a3648" strokeWidth="0.5" opacity="0.9" />
        <rect x="11.4" y="11.4" width="25.2" height="25.2" rx="4.2" ry="4.2" fill="none" stroke="url(#araxMetalInner)" strokeWidth="0.9" opacity="0.95" />
      </g>

      <ellipse cx="24" cy="24" rx="10.5" ry="6.2" stroke="#aa94ce" strokeWidth="0.7" strokeOpacity="0.95" fill="none" />
      <ellipse cx="24" cy="24" rx="8.8"  ry="4.9" stroke="#94ccb7" strokeWidth="0.6" strokeOpacity="0.85" fill="none" />
      <ellipse cx="24" cy="24" rx="7.1"  ry="3.6" stroke="#e1d0f6" strokeWidth="0.5" strokeOpacity="0.85" fill="none" />
      <ellipse cx="24" cy="24" rx="5.4"  ry="2.5" stroke="#adead4" strokeWidth="0.4" strokeOpacity="0.7" fill="none" />

      <g ref={pupilRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="24" cy="24" r="4.8" fill="url(#araxPupil)" filter="url(#araxGlow)" />
        <circle cx="24" cy="24" r="1.9" fill="#ffffff">
          <animate attributeName="r" values="1.7;2.2;1.7" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.92;1;0.92" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="23.2" cy="23.2" r="0.6" fill="#ffffff" opacity="0.95" />
      </g>

    </svg>
  )
}

export function AtaraxiaLogoCompact({ size = 22, className = '' }: { size?: number; className?: string }) {
  return <AtaraxiaLogo size={size} className={className} ambient={false} />
}
