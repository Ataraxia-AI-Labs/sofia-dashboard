// __tests__/components/status-badges.test.tsx
// Tests for: CampaignStatusBadge, CallStatusBadge, EmptyState, Spinner

import React from 'react'
import { render, screen } from '@testing-library/react'

// ===================================================================
// CampaignStatusBadge
// ===================================================================
import { CampaignStatusBadge, STATUS_CONFIG as CAMPAIGN_STATUS } from '@/components/campaign-status-badge'

describe('CampaignStatusBadge', () => {
  it('has 6 statuses configured', () => {
    expect(Object.keys(CAMPAIGN_STATUS)).toHaveLength(6)
  })

  it('renders DRAFT as Borrador', () => {
    render(<CampaignStatusBadge status="DRAFT" />)
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })

  it('renders SCHEDULED as Programada', () => {
    render(<CampaignStatusBadge status="SCHEDULED" />)
    expect(screen.getByText('Programada')).toBeInTheDocument()
  })

  it('renders SENDING as Enviando', () => {
    render(<CampaignStatusBadge status="SENDING" />)
    expect(screen.getByText('Enviando')).toBeInTheDocument()
  })

  it('renders COMPLETED as Completada', () => {
    render(<CampaignStatusBadge status="COMPLETED" />)
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })

  it('renders CANCELLED as Cancelada', () => {
    render(<CampaignStatusBadge status="CANCELLED" />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
  })

  it('renders ANALYZED as Analizada', () => {
    render(<CampaignStatusBadge status="ANALYZED" />)
    expect(screen.getByText('Analizada')).toBeInTheDocument()
  })

  it('falls back to DRAFT for unknown status', () => {
    render(<CampaignStatusBadge status={'UNKNOWN' as 'DRAFT'} />)
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })
})

// ===================================================================
// CallStatusBadge
// ===================================================================
import { CallStatusBadge, STATUS_CONFIG as CALL_STATUS } from '@/components/call-status-badge'

describe('CallStatusBadge', () => {
  it('has 5 statuses configured', () => {
    expect(Object.keys(CALL_STATUS)).toHaveLength(5)
  })

  it('renders IN_PROGRESS as En curso', () => {
    render(<CallStatusBadge status="IN_PROGRESS" />)
    expect(screen.getByText('En curso')).toBeInTheDocument()
  })

  it('renders COMPLETED as Completada', () => {
    render(<CallStatusBadge status="COMPLETED" />)
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })

  it('renders TRANSFERRED as Transferida', () => {
    render(<CallStatusBadge status="TRANSFERRED" />)
    expect(screen.getByText('Transferida')).toBeInTheDocument()
  })

  it('renders MISSED as Perdida', () => {
    render(<CallStatusBadge status="MISSED" />)
    expect(screen.getByText('Perdida')).toBeInTheDocument()
  })

  it('renders FAILED as Fallida', () => {
    render(<CallStatusBadge status="FAILED" />)
    expect(screen.getByText('Fallida')).toBeInTheDocument()
  })

  it('IN_PROGRESS has pulse animation element', () => {
    const { container } = render(<CallStatusBadge status="IN_PROGRESS" />)
    const pulseEl = container.querySelector('.animate-ping')
    expect(pulseEl).toBeTruthy()
  })

  it('COMPLETED does not have pulse', () => {
    const { container } = render(<CallStatusBadge status="COMPLETED" />)
    expect(container.querySelector('.animate-ping')).toBeNull()
  })

  it('falls back to COMPLETED for unknown', () => {
    render(<CallStatusBadge status={'UNKNOWN' as 'COMPLETED'} />)
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })
})

// ===================================================================
// EmptyState
// ===================================================================
import { EmptyState } from '@/components/ui/empty-state'
import { AlertCircle } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No hay datos" />)
    expect(screen.getByText('No hay datos')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Vacio" description="Agrega pacientes para empezar" />)
    expect(screen.getByText('Agrega pacientes para empezar')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState title="Vacio" />)
    expect(screen.queryByText('Agrega')).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState title="Test" icon={AlertCircle} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders action when provided', () => {
    render(<EmptyState title="Test" action={<button>Crear</button>} />)
    expect(screen.getByText('Crear')).toBeInTheDocument()
  })

  it('does not render action when not provided', () => {
    render(<EmptyState title="Test" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// ===================================================================
// Spinner
// ===================================================================
import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('animate-spin')
    expect(el).toHaveClass('w-5')
  })

  it('renders small size', () => {
    const { container } = render(<Spinner size="sm" />)
    expect(container.firstChild).toHaveClass('w-4')
  })

  it('renders large size', () => {
    const { container } = render(<Spinner size="lg" />)
    expect(container.firstChild).toHaveClass('w-8')
  })

  it('applies custom className', () => {
    const { container } = render(<Spinner className="text-red-500" />)
    expect(container.firstChild).toHaveClass('text-red-500')
  })
})
