// __tests__/lib/api/patients.test.ts
// Tests for patients API module

import '@testing-library/jest-dom'

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import {
  fetchPatients, fetchPatientDetail, fetchPatientMLFeatures,
  createPatient, updatePatient, exportPatientsCSV, sendWhatsAppMessage,
} from '@/lib/api/patients'

describe('Patients API', () => {
  beforeEach(() => jest.clearAllMocks())

  // ---------------------------------------------------------------
  // fetchPatients
  // ---------------------------------------------------------------
  describe('fetchPatients', () => {
    it('fetches patients for org', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ patients: [{ id: 'p1' }], total: 1 }),
      })
      const result = await fetchPatients('org-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/patients/org-1'))
      expect(result.patients).toHaveLength(1)
    })

    it('includes limit and offset params', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ patients: [], total: 0 }),
      })
      await fetchPatients('org-1', { limit: 20, offset: 40 })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('limit=20')
      expect(url).toContain('offset=40')
    })

    it('includes search param', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ patients: [], total: 0 }),
      })
      await fetchPatients('org-1', { search: 'Maria' })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('search=Maria')
    })

    it('includes orderBy and orderDir', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ patients: [], total: 0 }),
      })
      await fetchPatients('org-1', { orderBy: 'created_at', orderDir: 'desc' })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('orderBy=created_at')
      expect(url).toContain('orderDir=desc')
    })

    it('appends branch_id via withBranch', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ patients: [], total: 0 }),
      })
      await fetchPatients('org-1', { branchId: 'br-1' })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('branch_id=br-1')
    })

    it('throws on error response', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchPatients('org-1')).rejects.toThrow('Patients error: 500')
    })
  })

  // ---------------------------------------------------------------
  // fetchPatientDetail
  // ---------------------------------------------------------------
  describe('fetchPatientDetail', () => {
    it('fetches detail by patient id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'p1', full_name: 'Maria' }),
      })
      const result = await fetchPatientDetail('p1')
      expect(result.full_name).toBe('Maria')
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/patients/p1/detail'))
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 404 })
      await expect(fetchPatientDetail('p-bad')).rejects.toThrow('Patient detail error: 404')
    })
  })

  // ---------------------------------------------------------------
  // fetchPatientMLFeatures
  // ---------------------------------------------------------------
  describe('fetchPatientMLFeatures', () => {
    it('returns ML features on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ lead_score: 85 }),
      })
      const result = await fetchPatientMLFeatures('p1')
      expect(result.lead_score).toBe(85)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchPatientMLFeatures('p1')
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------
  // createPatient
  // ---------------------------------------------------------------
  describe('createPatient', () => {
    it('sends POST with patient data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'p-new' }),
      })
      const result = await createPatient('org-1', {
        full_name: 'Ana Lopez',
        phone: '573001234567',
        email: 'ana@test.com',
      })
      expect(result.id).toBe('p-new')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/patients/org-1'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Ana Lopez'),
        })
      )
    })

    it('uses defaults for missing optional fields', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'p-new' }),
      })
      await createPatient('org-1', { full_name: '', phone: '57300' })
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.full_name).toBe('Por identificar')
      expect(body.city).toBe('Por identificar')
      expect(body.acquisition_channel).toBe('PRESENCIAL')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 400 })
      await expect(createPatient('org-1', { full_name: 'X', phone: '1' })).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------
  // updatePatient
  // ---------------------------------------------------------------
  describe('updatePatient', () => {
    it('sends PATCH with data', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await updatePatient('p1', { full_name: 'Updated' })
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/patients/p1'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 403 })
      await expect(updatePatient('p1', {})).rejects.toThrow('Update patient error: 403')
    })
  })

  // ---------------------------------------------------------------
  // exportPatientsCSV
  // ---------------------------------------------------------------
  describe('exportPatientsCSV', () => {
    it('downloads CSV blob', async () => {
      const mockBlob = new Blob(['csv-data'])
      mockAuthFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })
      // Mock URL and DOM
      const mockUrl = 'blob:test'
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockUrl)
      global.URL.revokeObjectURL = jest.fn()
      const mockClick = jest.fn()
      jest.spyOn(document, 'createElement').mockReturnValue({ click: mockClick, href: '', download: '' } as unknown as HTMLElement)

      await exportPatientsCSV('org-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/patients/org-1/export-csv'))
      expect(mockClick).toHaveBeenCalled()
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(exportPatientsCSV('org-1')).rejects.toThrow('Export CSV error: 500')
    })
  })

  // ---------------------------------------------------------------
  // sendWhatsAppMessage
  // ---------------------------------------------------------------
  describe('sendWhatsAppMessage', () => {
    it('sends POST with message data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sent: true }),
      })
      const result = await sendWhatsAppMessage('org-1', '573001234567', 'Hola')
      expect(result.sent).toBe(true)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.org_id).toBe('org-1')
      expect(body.phone).toBe('573001234567')
      expect(body.message).toBe('Hola')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(sendWhatsAppMessage('org-1', '57', 'hi')).rejects.toThrow()
    })
  })
})
