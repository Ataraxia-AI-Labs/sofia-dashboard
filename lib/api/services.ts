import { API_URL, authFetch } from './helpers'

export async function fetchServicesCatalog(orgId: string) {
  const res = await authFetch(`${API_URL}/services/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function createService(orgId: string, data: {
  name: string; description?: string; price: number; currency?: string
  duration_minutes?: number; category?: string; requires_deposit?: boolean; deposit_amount?: number
}) {
  const res = await authFetch(`${API_URL}/services/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description || '',
      price: data.price,
      currency: data.currency || 'COP',
      duration_minutes: data.duration_minutes || 60,
      category: data.category || 'GENERAL',
      requires_deposit: data.requires_deposit || false,
      deposit_amount: data.deposit_amount || 0,
    }),
  })
  if (!res.ok) throw new Error(`Create service error: ${res.status}`)
}

export async function updateService(serviceId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update service error: ${res.status}`)
}

export async function deleteService(serviceId: string) {
  const res = await authFetch(`${API_URL}/services/${serviceId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete service error: ${res.status}`)
}
