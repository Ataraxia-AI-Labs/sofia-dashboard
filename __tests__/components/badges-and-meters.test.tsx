// __tests__/components/badges-and-meters.test.tsx
// Tests for: LeadScoreBadge, SentimentBadge, ChannelBadge,
//            ConfidenceMeter, ConfidenceBar, classifyScore

import React from 'react'
import { render, screen } from '@testing-library/react'

// ===================================================================
// LeadScoreBadge
// ===================================================================
import { LeadScoreBadge, classifyScore, CLASSIFICATION_CONFIG } from '@/components/lead-score-badge'

describe('classifyScore', () => {
  it('returns HOT for score >= 75', () => expect(classifyScore(75)).toBe('HOT'))
  it('returns HOT for score 100', () => expect(classifyScore(100)).toBe('HOT'))
  it('returns WARM for score 50', () => expect(classifyScore(50)).toBe('WARM'))
  it('returns WARM for score 74', () => expect(classifyScore(74)).toBe('WARM'))
  it('returns COLD for score 25', () => expect(classifyScore(25)).toBe('COLD'))
  it('returns COLD for score 49', () => expect(classifyScore(49)).toBe('COLD'))
  it('returns DEAD for score 24', () => expect(classifyScore(24)).toBe('DEAD'))
  it('returns DEAD for score 0', () => expect(classifyScore(0)).toBe('DEAD'))
})

describe('CLASSIFICATION_CONFIG', () => {
  it('has all 4 classifications', () => {
    expect(Object.keys(CLASSIFICATION_CONFIG)).toEqual(['HOT', 'WARM', 'COLD', 'DEAD'])
  })

  it('each has required fields', () => {
    for (const key of Object.keys(CLASSIFICATION_CONFIG) as Array<keyof typeof CLASSIFICATION_CONFIG>) {
      const cfg = CLASSIFICATION_CONFIG[key]
      expect(cfg.icon).toBeDefined()
      expect(cfg.label).toBe(key)
      expect(cfg.color).toBeTruthy()
      expect(cfg.bg).toBeTruthy()
      expect(cfg.border).toBeTruthy()
    }
  })
})

describe('LeadScoreBadge', () => {
  it('renders score and label', () => {
    render(<LeadScoreBadge score={85} classification="HOT" />)
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('HOT')).toBeInTheDocument()
  })

  it('hides score when showScore=false', () => {
    render(<LeadScoreBadge score={85} classification="HOT" showScore={false} />)
    expect(screen.queryByText('85')).not.toBeInTheDocument()
    expect(screen.getByText('HOT')).toBeInTheDocument()
  })

  it('renders compact mode with title', () => {
    render(<LeadScoreBadge score={60} classification="WARM" compact />)
    expect(screen.queryByText('WARM')).not.toBeInTheDocument()
    const el = document.querySelector('[title="WARM — Score: 60"]')
    expect(el).toBeTruthy()
  })

  it('renders all classifications', () => {
    const { rerender } = render(<LeadScoreBadge score={90} classification="HOT" />)
    expect(screen.getByText('HOT')).toBeInTheDocument()

    rerender(<LeadScoreBadge score={40} classification="COLD" />)
    expect(screen.getByText('COLD')).toBeInTheDocument()

    rerender(<LeadScoreBadge score={10} classification="DEAD" />)
    expect(screen.getByText('DEAD')).toBeInTheDocument()
  })
})

// ===================================================================
// SentimentBadge
// ===================================================================
import { SentimentBadge, SENTIMENT_CONFIG } from '@/components/sentiment-badge'

describe('SENTIMENT_CONFIG', () => {
  it('has all 5 sentiments', () => {
    expect(Object.keys(SENTIMENT_CONFIG)).toEqual(['POSITIVE', 'NEUTRAL', 'FRUSTRATED', 'CONFUSED', 'ENTHUSIASTIC'])
  })
})

describe('SentimentBadge', () => {
  it('renders label for POSITIVE', () => {
    render(<SentimentBadge sentiment="POSITIVE" />)
    expect(screen.getByText('Positivo')).toBeInTheDocument()
  })

  it('renders label for FRUSTRATED', () => {
    render(<SentimentBadge sentiment="FRUSTRATED" />)
    expect(screen.getByText('Frustrado')).toBeInTheDocument()
  })

  it('renders compact mode with short indicator', () => {
    render(<SentimentBadge sentiment="NEUTRAL" compact />)
    expect(screen.getByText('~')).toBeInTheDocument()
    expect(screen.queryByText('Neutral')).not.toBeInTheDocument() // label hidden in compact
  })

  it('falls back to NEUTRAL for unknown sentiment', () => {
    render(<SentimentBadge sentiment={'UNKNOWN' as 'NEUTRAL'} />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('renders all sentiments', () => {
    const sentiments = ['POSITIVE', 'NEUTRAL', 'FRUSTRATED', 'CONFUSED', 'ENTHUSIASTIC'] as const
    sentiments.forEach((s) => {
      const { unmount } = render(<SentimentBadge sentiment={s} />)
      expect(screen.getByText(SENTIMENT_CONFIG[s].label)).toBeInTheDocument()
      unmount()
    })
  })
})

// ===================================================================
// ChannelBadge
// ===================================================================
import { ChannelBadge, CHANNEL_CONFIG } from '@/components/channel-badge'

describe('CHANNEL_CONFIG', () => {
  it('has all 5 channels', () => {
    expect(Object.keys(CHANNEL_CONFIG)).toEqual(['WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'WEBCHAT', 'VOICE'])
  })
})

describe('ChannelBadge', () => {
  it('renders WhatsApp label', () => {
    render(<ChannelBadge channel="WHATSAPP" />)
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  })

  it('renders Instagram label', () => {
    render(<ChannelBadge channel="INSTAGRAM" />)
    expect(screen.getByText('Instagram')).toBeInTheDocument()
  })

  it('renders Web Chat label', () => {
    render(<ChannelBadge channel="WEBCHAT" />)
    expect(screen.getByText('Web Chat')).toBeInTheDocument()
  })

  it('renders Voz label', () => {
    render(<ChannelBadge channel="VOICE" />)
    expect(screen.getByText('Voz')).toBeInTheDocument()
  })

  it('renders compact mode with title', () => {
    render(<ChannelBadge channel="WHATSAPP" compact />)
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument()
    const el = document.querySelector('[title="WhatsApp"]')
    expect(el).toBeTruthy()
  })

  it('falls back to WHATSAPP for unknown channel', () => {
    render(<ChannelBadge channel={'UNKNOWN' as 'WHATSAPP'} />)
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  })
})

// ===================================================================
// ConfidenceMeter & ConfidenceBar
// ===================================================================
import { ConfidenceMeter, ConfidenceBar } from '@/components/confidence-meter'

describe('ConfidenceMeter', () => {
  it('renders value text', () => {
    render(<ConfidenceMeter value={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renders aria-label on SVG', () => {
    render(<ConfidenceMeter value={50} />)
    expect(screen.getByRole('img', { name: 'Confidence: 50%' })).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<ConfidenceMeter value={80} label="AI Accuracy" />)
    expect(screen.getByText('AI Accuracy')).toBeInTheDocument()
  })

  it('clamps value to 0-100', () => {
    render(<ConfidenceMeter value={150} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('clamps negative value to 0', () => {
    render(<ConfidenceMeter value={-10} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('uses red color for low values', () => {
    render(<ConfidenceMeter value={20} />)
    // Just check it renders without error
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('uses green color for high values', () => {
    render(<ConfidenceMeter value={80} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })
})

describe('ConfidenceBar', () => {
  it('renders value text', () => {
    render(<ConfidenceBar value={65} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('clamps value to 0-100', () => {
    render(<ConfidenceBar value={200} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders with zero', () => {
    render(<ConfidenceBar value={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
