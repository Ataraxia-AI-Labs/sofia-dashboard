// __tests__/lib/api/appointments.test.ts

import '@testing-library/jest-dom'

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import {
  fetchAppointments, fetchPatientAppointments, updateAppointmentStatus,
  createAppointment, rescheduleAppointment, assignStaff,
  fetchStaffList, fetchAppointmentSeries, createAppointmentSeries, updateAppointmentSeries,
} from '@/lib/api/appointments'

describe('Appointments API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchAppointments', () => {
    it('fetches appointments for org', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'a1' }]),
      })
      const result = await fetchAppointments('org-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/appointments/org-1'))
      expect(result).toHaveLength(1)
    })

    it('includes from, to, status params', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await fetchAppointments('org-1', { from: '2026-01-01', to: '2026-01-31', status: 'AGENDADA' })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('from=2026-01-01')
      expect(url).toContain('to=2026-01-31')
      expect(url).toContain('status=AGENDADA')
    })

    it('includes branch_id and staff_id', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await fetchAppointments('org-1', { branchId: 'br-1', staffId: 'staff-1' })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('branch_id=br-1')
      expect(url).toContain('staff_id=staff-1')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchAppointments('org-1')).rejects.toThrow('Appointments error: 500')
    })
  })

  describe('fetchPatientAppointments', () => {
    it('fetches patient detail then filters appointments', async () => {
      mockAuthFetch
        .mockResolvedValueOnce({
          ok: true, json: () => Promise.resolve({ organization_id: 'org-1' }),
        })
        .mockResolvedValueOnce({
          ok: true, json: () => Promise.resolve([
            { id: 'a1', patient_id: 'p1' },
            { id: 'a2', patient_id: 'p2' },
          ]),
        })
      const result = await fetchPatientAppointments('p1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a1')
    })

    it('returns empty if patient detail fails', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchPatientAppointments('p-bad')
      expect(result).toEqual([])
    })

    it('returns empty if patient has no org_id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ organization_id: null }),
      })
      const result = await fetchPatientAppointments('p1')
      expect(result).toEqual([])
    })
  })

  describe('updateAppointmentStatus', () => {
    it('sends PATCH with status', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await updateAppointmentStatus('a1', 'CANCELADA', 'No puede asistir')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.status).toBe('CANCELADA')
      expect(body.cancellation_reason).toBe('No puede asistir')
    })

    it('omits cancellation_reason when not provided', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await updateAppointmentStatus('a1', 'COMPLETADA')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.cancellation_reason).toBeUndefined()
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 404 })
      await expect(updateAppointmentStatus('a-bad', 'X')).rejects.toThrow()
    })
  })

  describe('createAppointment', () => {
    it('sends POST with appointment data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'a-new' }),
      })
      const result = await createAppointment('org-1', {
        patient_id: 'p1',
        start_time: '2026-04-01T10:00:00',
        end_time: '2026-04-01T11:00:00',
        service_name: 'Botox',
      })
      expect(result.id).toBe('a-new')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/appointments/org-1'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 400 })
      await expect(createAppointment('org-1', {
        patient_id: 'p1', start_time: 'x', end_time: 'x', service_name: 'x',
      })).rejects.toThrow()
    })
  })

  describe('rescheduleAppointment', () => {
    it('sends POST with reschedule data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'a1' }),
      })
      await rescheduleAppointment('a1', { new_start_time: '2026-04-02T10:00:00', reason: 'conflict' })
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/appointments/a1/reschedule'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws with text error on failure', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false, status: 409,
        text: () => Promise.resolve('Conflict detected'),
      })
      await expect(rescheduleAppointment('a1', { new_start_time: 'x' })).rejects.toThrow('Conflict detected')
    })
  })

  describe('assignStaff', () => {
    it('sends PATCH with staff_id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ staff_id: 's1' }),
      })
      await assignStaff('a1', 's1')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.staff_id).toBe('s1')
    })

    it('sends null to unassign', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      await assignStaff('a1', null)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.staff_id).toBeNull()
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 403 })
      await expect(assignStaff('a1', 's1')).rejects.toThrow()
    })
  })

  describe('fetchStaffList', () => {
    it('returns staff list on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 's1' }]),
      })
      const result = await fetchStaffList('org-1')
      expect(result).toHaveLength(1)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchStaffList('org-1')).toEqual([])
    })
  })

  describe('fetchAppointmentSeries', () => {
    it('returns series on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'ser-1' }]),
      })
      expect(await fetchAppointmentSeries('org-1')).toHaveLength(1)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchAppointmentSeries('org-1')).toEqual([])
    })
  })

  describe('createAppointmentSeries', () => {
    it('sends POST with series data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'ser-new' }),
      })
      const result = await createAppointmentSeries('org-1', {
        patient_id: 'p1', service_name: 'Control', recurrence_rule: 'WEEKLY',
        preferred_time: '10:00', total_occurrences: 4, starts_at: '2026-04-01',
      })
      expect(result.id).toBe('ser-new')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 400 })
      await expect(createAppointmentSeries('org-1', {
        patient_id: 'p1', service_name: 'X', recurrence_rule: 'X',
        preferred_time: 'X', total_occurrences: 1, starts_at: 'X',
      })).rejects.toThrow()
    })
  })

  describe('updateAppointmentSeries', () => {
    it('sends PATCH with update data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'ser-1' }),
      })
      await updateAppointmentSeries('ser-1', { status: 'CANCELLED' })
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/appointments/series/ser-1'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(updateAppointmentSeries('ser-1', {})).rejects.toThrow()
    })
  })
})
