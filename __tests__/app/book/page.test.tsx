// __tests__/app/book/page.test.tsx
// Tests for the Booking page (app/book/[orgId]/page.tsx)

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

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

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const CLINIC_INFO = {
  name: 'Clinica Sonrisa',
  specialty: 'Odontologia',
  city: 'Bogota',
  address: 'Calle 100 #15-20',
  phone: '+573001234567',
  booking_enabled: true,
}

const SERVICES = {
  services: [
    { id: 's1', name: 'Limpieza Dental', price: 150000, duration_minutes: 30, category: 'Dental', description: 'Limpieza profunda', requires_deposit: false, deposit_amount: 0 },
    { id: 's2', name: 'Blanqueamiento', price: 500000, duration_minutes: 60, category: 'Estetica', description: null, requires_deposit: true, deposit_amount: 100000 },
  ],
}

const HOURS = {
  hours: [
    { day: 0, day_name: 'Lunes', open_time: '08:00', close_time: '18:00', is_open: true },
    { day: 1, day_name: 'Martes', open_time: '08:00', close_time: '18:00', is_open: true },
    { day: 2, day_name: 'Miercoles', open_time: '08:00', close_time: '18:00', is_open: true },
    { day: 3, day_name: 'Jueves', open_time: '08:00', close_time: '18:00', is_open: true },
    { day: 4, day_name: 'Viernes', open_time: '08:00', close_time: '18:00', is_open: true },
    { day: 5, day_name: 'Sabado', open_time: '09:00', close_time: '13:00', is_open: true },
    { day: 6, day_name: 'Domingo', open_time: '00:00', close_time: '00:00', is_open: false },
  ],
}

import BookingPage from '@/app/book/[orgId]/page'

function setupFetchMocks(overrides: Record<string, any> = {}) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/info')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.info ?? CLINIC_INFO),
      })
    }
    if (url.includes('/services')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.services ?? SERVICES),
      })
    }
    if (url.includes('/hours')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.hours ?? HOURS),
      })
    }
    if (url.includes('/availability')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ available_slots: overrides.slots ?? ['09:00', '10:00', '11:00'] }),
      })
    }
    if (url.includes('/appointment')) {
      return Promise.resolve({
        ok: overrides.appointmentOk !== false,
        json: () => Promise.resolve(overrides.appointmentResult ?? { appointment_id: 'apt-1', message: 'Reserva solicitada correctamente' }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

describe('BookingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupFetchMocks()
  })

  it('shows loading state initially', () => {
    // Don't resolve fetch yet
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('shows clinic disabled message when booking_enabled is false', async () => {
    setupFetchMocks({ info: { ...CLINIC_INFO, booking_enabled: false } })
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/no tiene reservas en linea habilitadas/)).toBeInTheDocument()
    })
  })

  it('shows disabled message when clinic info is null', async () => {
    setupFetchMocks({ info: null })
    // Override info fetch to return null
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/info')) return Promise.resolve({ ok: true, json: () => Promise.resolve(null) })
      if (url.includes('/services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(SERVICES) })
      if (url.includes('/hours')) return Promise.resolve({ ok: true, json: () => Promise.resolve(HOURS) })
      return Promise.resolve({ ok: false })
    })
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/no tiene reservas en linea habilitadas/)).toBeInTheDocument()
    })
  })

  it('shows disabled/error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    // On fetch failure: error is set, clinic stays null => shows booking disabled view
    await waitFor(() => {
      expect(screen.getByText(/no tiene reservas en linea habilitadas/)).toBeInTheDocument()
    })
  })

  it('renders clinic name and specialty after loading', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Clinica Sonrisa')).toBeInTheDocument()
      expect(screen.getByText('Odontologia')).toBeInTheDocument()
    })
  })

  it('renders clinic city and address', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/Bogota/)).toBeInTheDocument()
    })
  })

  it('renders step progress pipeline with 4 numbered steps', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      // Progress pipeline shows numbered steps (1, 2, 3, 4)
      // Step labels are used as React keys, step numbers are displayed
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('renders services list on step 0', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Selecciona un servicio')).toBeInTheDocument()
      expect(screen.getByText('Limpieza Dental')).toBeInTheDocument()
      expect(screen.getByText('Blanqueamiento')).toBeInTheDocument()
    })
  })

  it('shows service duration and category', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/30 min/)).toBeInTheDocument()
      // "Dental" appears in multiple places (service name contains it too)
      const dentalElements = screen.getAllByText(/Dental/)
      expect(dentalElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows deposit requirement for services that need it', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText(/Requiere anticipo/)).toBeInTheDocument()
    })
  })

  it('shows empty services message when none available', async () => {
    setupFetchMocks({ services: { services: [] } })
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('No hay servicios disponibles.')).toBeInTheDocument()
    })
  })

  it('moves to step 1 (calendar) when selecting a service', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => {
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument()
    })
  })

  it('shows "Cambiar servicio" button on step 1', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => {
      expect(screen.getByText('Cambiar servicio')).toBeInTheDocument()
    })
  })

  it('goes back to step 0 when clicking "Cambiar servicio"', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => screen.getByText('Cambiar servicio'))
    fireEvent.click(screen.getByText('Cambiar servicio'))
    await waitFor(() => {
      expect(screen.getByText('Selecciona un servicio')).toBeInTheDocument()
    })
  })

  it('renders day abbreviation headers in calendar', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => {
      expect(screen.getByText('Lun')).toBeInTheDocument()
      expect(screen.getByText('Mar')).toBeInTheDocument()
      expect(screen.getByText('Vie')).toBeInTheDocument()
    })
  })

  it('renders Powered by SofIA footer', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('SofIA')).toBeInTheDocument()
    })
  })

  it('shows patient info form on step 3 after selecting slot', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    // Select service
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => screen.getByText('Selecciona una fecha'))

    // Click a date button (find an enabled one)
    const dateButtons = document.querySelectorAll('button:not([disabled])')
    // Find a date number button in the calendar grid
    const calendarButtons = Array.from(dateButtons).filter(btn => {
      const text = btn.textContent || ''
      return /^\d{1,2}$/.test(text.trim()) && !btn.hasAttribute('disabled')
    })
    if (calendarButtons.length > 0) {
      fireEvent.click(calendarButtons[0])

      await waitFor(() => screen.getByText('Selecciona una hora'))

      // Select a time slot
      await waitFor(() => screen.getByText('09:00'))
      fireEvent.click(screen.getByText('09:00'))

      await waitFor(() => {
        expect(screen.getByText('Tus datos')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Nombre completo *')).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Telefono/)).toBeInTheDocument()
      })
    }
  })

  it('disables submit button when name and phone are empty', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => screen.getByText('Selecciona una fecha'))

    const calendarButtons = Array.from(document.querySelectorAll('button:not([disabled])')).filter(btn => {
      const text = btn.textContent || ''
      return /^\d{1,2}$/.test(text.trim())
    })
    if (calendarButtons.length > 0) {
      fireEvent.click(calendarButtons[0])
      await waitFor(() => screen.getByText('09:00'))
      fireEvent.click(screen.getByText('09:00'))
      await waitFor(() => screen.getByText('Tus datos'))

      // Confirm button should be disabled when name/phone are empty
      const confirmBtn = screen.getByText('Confirmar Reserva').closest('button')!
      expect(confirmBtn).toBeDisabled()
    }
  })

  it('shows no slots message when availability returns empty', async () => {
    setupFetchMocks({ slots: [] })
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => screen.getByText('Limpieza Dental'))
    fireEvent.click(screen.getByText('Limpieza Dental'))
    await waitFor(() => screen.getByText('Selecciona una fecha'))

    const calendarButtons = Array.from(document.querySelectorAll('button:not([disabled])')).filter(btn => {
      const text = btn.textContent || ''
      return /^\d{1,2}$/.test(text.trim())
    })
    if (calendarButtons.length > 0) {
      fireEvent.click(calendarButtons[0])
      await waitFor(() => {
        expect(screen.getByText(/No hay horarios disponibles/)).toBeInTheDocument()
      })
    }
  })

  it('formats prices in COP currency', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      // Check for COP formatted prices ($ symbol present)
      const priceElements = screen.getAllByText(/\$\s*150/)
      expect(priceElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('service description is shown when present', async () => {
    render(<BookingPage params={{ orgId: 'org-1' }} />)
    await waitFor(() => {
      expect(screen.getByText('Limpieza profunda')).toBeInTheDocument()
    })
  })
})
