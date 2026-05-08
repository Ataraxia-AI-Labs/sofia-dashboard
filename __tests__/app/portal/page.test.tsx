// __tests__/app/portal/page.test.tsx
// Tests for the Patient Portal page (app/portal/[token]/page.tsx)

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// lucide-react — Proxy mock
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

// Mock portal API. S154: la página ahora usa loadPortal (que devuelve
// {ok, data|error}) en vez de getPortalData (que devolvía PortalData|null).
// El helper aquí mantiene el shape antiguo del mock (resolve(MOCK_DATA)
// significa éxito; resolve(null) significa fallo) y lo traduce al nuevo
// contrato — así no toca cambiar cada test individualmente.
const mockGetPortalData = jest.fn()
const mockCancelAppointment = jest.fn()
const mockRequestReschedule = jest.fn()

jest.mock('@/lib/api/portal', () => ({
  loadPortal: async (...args: any[]) => {
    try {
      const result = await mockGetPortalData(...args)
      if (result === null || result === undefined) {
        return { ok: false, error: 'EXPIRED_OR_INVALID' }
      }
      return { ok: true, data: result }
    } catch {
      // El loadPortal real nunca relanza — convierte excepciones a NETWORK.
      return { ok: false, error: 'NETWORK' }
    }
  },
  cancelAppointment: (...args: any[]) => mockCancelAppointment(...args),
  requestReschedule: (...args: any[]) => mockRequestReschedule(...args),
}))

import type { PortalData } from '@/types'

const MOCK_DATA: PortalData = {
  patient_info: { name: 'Maria Garcia Perez', phone: '+573001234567', email: 'maria@test.com' },
  clinic_name: 'Clinica Sonrisa',
  clinic_phone: '+573001234567',
  upcoming_appointments: [
    { id: 'apt-1', date: '2026-04-01', time: '10:00', doctor: 'Dr. Perez', service: 'Limpieza Dental', status: 'CONFIRMED' },
    { id: 'apt-2', date: '2026-04-15', time: '14:00', doctor: 'Dra. Lopez', service: 'Blanqueamiento', status: 'CONFIRMED' },
  ],
  appointment_history: [
    { date: '2026-03-01', service: 'Consulta General', doctor: 'Perez' },
    { date: '2026-02-15', service: 'Limpieza', doctor: 'Lopez' },
  ],
  payments: [
    { id: 'pay-1', date: '2026-03-20', amount: 150000, status: 'PENDING', description: 'Limpieza Dental' },
    { id: 'pay-2', date: '2026-02-20', amount: 200000, status: 'PAID', description: 'Consulta' },
  ],
  gamification: {
    total_points: 1250,
    tier: 'GOLD',
    streak_months: 6,
    points_to_next_tier: 750,
    next_tier: 'PLATINUM',
    recent_actions: [
      { action: 'APPOINTMENT_COMPLETED', points: 100, date: '2026-03-01' },
      { action: 'PAYMENT_MADE', points: 50, date: '2026-02-20' },
    ],
  },
  referral: { code: 'MARIA2026', referrals_made: 3, discounts_earned: 2 },
  treatments: [],
}

import PatientPortalPage from '@/app/portal/[token]/page'

describe('PatientPortalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPortalData.mockResolvedValue(MOCK_DATA)
    mockCancelAppointment.mockResolvedValue(true)
    mockRequestReschedule.mockResolvedValue(true)
    // Mock clipboard
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } })
    // Mock window.open
    window.open = jest.fn()
  })

  it('shows loading state initially', () => {
    mockGetPortalData.mockReturnValue(new Promise(() => {}))
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    expect(screen.getByText('Cargando tu portal...')).toBeInTheDocument()
  })

  it('shows expired-link copy when token is rejected (null result)', async () => {
    mockGetPortalData.mockResolvedValue(null)
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      // S154: el copy específico para 401 le dice al paciente qué hacer
      // (pedir un link nuevo a la clínica) en vez del genérico anterior.
      expect(screen.getByText('Tu enlace expiró')).toBeInTheDocument()
      expect(screen.getByText(/los enlaces del portal expiran/i)).toBeInTheDocument()
    })
  })

  it('shows network-error copy when fetch throws', async () => {
    mockGetPortalData.mockRejectedValue(new Error('Network'))
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Sin conexión')).toBeInTheDocument()
      expect(screen.getByText(/Verifica tu conexión/i)).toBeInTheDocument()
    })
  })

  it('shows retry button only on network errors (not on expiry)', async () => {
    // Network → reintento permitido
    mockGetPortalData.mockRejectedValueOnce(new Error('Network'))
    const { unmount } = render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Reintentar')).toBeInTheDocument()
    })
    unmount()

    // Expiry → no tiene sentido reintentar; el operador tiene que mandar
    // un link nuevo. Ocultar el botón evita confusión.
    mockGetPortalData.mockResolvedValue(null)
    render(<PatientPortalPage params={{ token: 'tok-2' }} />)
    await waitFor(() => {
      expect(screen.getByText('Tu enlace expiró')).toBeInTheDocument()
    })
    expect(screen.queryByText('Reintentar')).not.toBeInTheDocument()
  })

  it('retries loading on retry button click after network error', async () => {
    mockGetPortalData
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce(MOCK_DATA)
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Reintentar'))
    fireEvent.click(screen.getByText('Reintentar'))
    await waitFor(() => {
      expect(mockGetPortalData).toHaveBeenCalledTimes(2)
    })
  })

  it('calls getPortalData with the correct token', async () => {
    render(<PatientPortalPage params={{ token: 'my-token-123' }} />)
    await waitFor(() => {
      expect(mockGetPortalData).toHaveBeenCalledWith('my-token-123')
    })
  })

  it('renders patient greeting with first name', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Hola, Maria')).toBeInTheDocument()
    })
  })

  it('renders clinic name', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Clinica Sonrisa')).toBeInTheDocument()
    })
  })

  it('renders tier badge with GOLD tier', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      const goldElements = screen.getAllByText('GOLD')
      expect(goldElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders total points', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      const pointsElements = screen.getAllByText(/1,250/)
      expect(pointsElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders progress bar to next tier', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/750 pts para PLATINUM/)).toBeInTheDocument()
    })
  })

  it('renders next appointment hero card', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Proxima cita')).toBeInTheDocument()
      // "Limpieza Dental" appears in appointments and payments
      const limpiezaElements = screen.getAllByText('Limpieza Dental')
      expect(limpiezaElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('10:00')).toBeInTheDocument()
    })
  })

  it('renders cancel and reschedule buttons for next appointment', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Cancelar cita')).toBeInTheDocument()
      expect(screen.getByText('Reagendar')).toBeInTheDocument()
    })
  })

  it('shows confirmation dialog when clicking cancel', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Cancelar cita'))
    fireEvent.click(screen.getByText('Cancelar cita'))
    await waitFor(() => {
      expect(screen.getByText('Si, cancelar')).toBeInTheDocument()
      expect(screen.getByText('No, mantener')).toBeInTheDocument()
    })
  })

  it('calls cancelAppointment when confirming cancel', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Cancelar cita'))
    fireEvent.click(screen.getByText('Cancelar cita'))
    await waitFor(() => screen.getByText('Si, cancelar'))
    fireEvent.click(screen.getByText('Si, cancelar'))
    await waitFor(() => {
      expect(mockCancelAppointment).toHaveBeenCalledWith('tok-1', 'apt-1')
    })
  })

  it('dismisses cancel confirmation with "No, mantener"', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Cancelar cita'))
    fireEvent.click(screen.getByText('Cancelar cita'))
    await waitFor(() => screen.getByText('No, mantener'))
    fireEvent.click(screen.getByText('No, mantener'))
    await waitFor(() => {
      expect(screen.getByText('Cancelar cita')).toBeInTheDocument()
      expect(screen.queryByText('Si, cancelar')).not.toBeInTheDocument()
    })
  })

  it('shows reschedule date picker when clicking Reagendar', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Reagendar'))
    fireEvent.click(screen.getByText('Reagendar'))
    await waitFor(() => {
      expect(screen.getByText('Enviar')).toBeInTheDocument()
    })
  })

  it('renders other upcoming appointments', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/Blanqueamiento/)).toBeInTheDocument()
    })
  })

  it('renders no appointments message when list is empty', async () => {
    const noAppts = { ...MOCK_DATA, upcoming_appointments: [] }
    mockGetPortalData.mockResolvedValue(noAppts)
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Sin citas pendientes')).toBeInTheDocument()
    })
  })

  it('renders gamification section with points, tier, and streak', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Mis puntos y logros')).toBeInTheDocument()
      expect(screen.getByText('Puntos')).toBeInTheDocument()
      expect(screen.getByText('Nivel')).toBeInTheDocument()
      expect(screen.getByText('Meses racha')).toBeInTheDocument()
    })
  })

  it('renders streak months value', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  it('renders recent actions', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/appointment completed/)).toBeInTheDocument()
      expect(screen.getByText('+100')).toBeInTheDocument()
    })
  })

  it('renders pending payments section', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Pagos pendientes')).toBeInTheDocument()
    })
  })

  it('renders paid payments section', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Historial de pagos')).toBeInTheDocument()
    })
  })

  it('renders appointment history toggle', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Historial de visitas')).toBeInTheDocument()
    })
  })

  it('toggles appointment history visibility', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('Historial de visitas'))

    // History should be collapsed initially
    expect(screen.queryByText(/Consulta General/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Historial de visitas'))

    await waitFor(() => {
      expect(screen.getByText(/Consulta General/)).toBeInTheDocument()
    })
  })

  it('renders referral section with code', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Refiere un amigo')).toBeInTheDocument()
      expect(screen.getByText('MARIA2026')).toBeInTheDocument()
    })
  })

  it('renders referral stats', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Referidos')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Descuentos ganados')).toBeInTheDocument()
    })
  })

  it('copies referral code to clipboard', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('MARIA2026'))

    // Find copy button by icon
    const copyIcon = screen.getByTestId('icon-Copy')
    fireEvent.click(copyIcon.closest('button')!)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('MARIA2026')
    )
  })

  it('opens WhatsApp share link', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => screen.getByText('MARIA2026'))

    const shareIcon = screen.getByTestId('icon-Share2')
    fireEvent.click(shareIcon.closest('button')!)

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('wa.me'),
      '_blank'
    )
  })

  it('renders WhatsApp contact link in footer', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Contactar clinica por WhatsApp')).toBeInTheDocument()
    })
  })

  it('renders Powered by SofIA footer', async () => {
    render(<PatientPortalPage params={{ token: 'tok-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('SofIA')).toBeInTheDocument()
      expect(screen.getByText(/Ataraxia IA Labs/)).toBeInTheDocument()
    })
  })
})
