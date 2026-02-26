import '@testing-library/jest-dom'

// Mock authFetch
const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }),
    },
  },
}))

import { fetchTeamMembers, inviteTeamMember, updateMemberRole, deactivateMember } from '@/lib/api/team'

describe('Team API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchTeamMembers', () => {
    it('fetches team members for org', async () => {
      const mockMembers = [
        { id: '1', user_id: 'u1', role: 'OWNER', is_active: true, created_at: '2026-01-01', email: 'owner@test.com' },
        { id: '2', user_id: 'u2', role: 'STAFF', is_active: true, created_at: '2026-01-02', email: 'staff@test.com' },
      ]
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ members: mockMembers }),
      })

      const result = await fetchTeamMembers('org-123')
      expect(mockAuthFetch).toHaveBeenCalledWith('https://test-api.example.com/dashboard/team/org-123')
      expect(result).toEqual(mockMembers)
    })

    it('returns empty array on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchTeamMembers('org-123')
      expect(result).toEqual([])
    })
  })

  describe('inviteTeamMember', () => {
    it('sends invite request', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await inviteTeamMember('org-123', 'new@test.com', 'STAFF')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/dashboard/team/org-123/invite',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@test.com', role: 'STAFF' }),
        })
      )
      expect(result.success).toBe(true)
    })

    it('returns error on failure', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Email already exists' }),
      })

      const result = await inviteTeamMember('org-123', 'existing@test.com', 'STAFF')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Email already exists')
    })
  })

  describe('updateMemberRole', () => {
    it('updates role', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await updateMemberRole('org-123', 'member-1', 'ADMIN')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/dashboard/team/org-123/members/member-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'ADMIN' }),
        })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 403 })
      await expect(updateMemberRole('org-123', 'member-1', 'ADMIN')).rejects.toThrow('Error 403')
    })
  })

  describe('deactivateMember', () => {
    it('sends delete request', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await deactivateMember('org-123', 'member-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/dashboard/team/org-123/members/member-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
