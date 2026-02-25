import { API_URL, authFetch } from './helpers'

export async function fetchStaffNotes(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/staff-notes`)
  if (!res.ok) return []
  return res.json()
}

export async function createStaffNote(patientId: string, content: string, _userId?: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/staff-notes`, {
    method: 'POST',
    body: JSON.stringify({
      note_content: content,
      is_private: true,
    }),
  })
  if (!res.ok) throw new Error(`Create note error: ${res.status}`)
}
