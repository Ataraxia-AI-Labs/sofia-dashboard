import { API_URL, authFetch, unwrapArray } from './helpers'
import type { Subscription, Invoice, UsageData, WompiConfig } from '@/types'

export async function fetchSubscription(orgId: string): Promise<Subscription | null> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.subscription || null
}

export async function createSubscription(orgId: string, body: {
  plan: string
  billing_cycle: string
  card_token: string
  customer_email: string
  acceptance_token: string
}): Promise<{ exito: boolean; subscription_id?: string; error?: string }> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function changePlan(orgId: string, newPlan: string, newBillingCycle?: string): Promise<{ exito: boolean; error?: string }> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/change-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_plan: newPlan, new_billing_cycle: newBillingCycle }),
  })
  return res.json()
}

export async function cancelSubscription(orgId: string, immediate = false): Promise<{ exito: boolean; error?: string }> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ immediate }),
  })
  return res.json()
}

export async function updatePaymentMethod(orgId: string, cardToken: string, acceptanceToken: string): Promise<{ exito: boolean; error?: string }> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/update-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_token: cardToken, acceptance_token: acceptanceToken }),
  })
  return res.json()
}

export async function fetchInvoices(orgId: string, limit = 20): Promise<Invoice[]> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/invoices?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<Invoice>(await res.json(), 'invoices')
}

export async function fetchUsage(orgId: string): Promise<UsageData | null> {
  const res = await authFetch(`${API_URL}/subscriptions/${orgId}/usage`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchWompiConfig(): Promise<WompiConfig | null> {
  const res = await authFetch(`${API_URL}/subscriptions/wompi-config`)
  if (!res.ok) return null
  return res.json()
}
