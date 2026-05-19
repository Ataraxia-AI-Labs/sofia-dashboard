import { API_URL, authFetch } from './helpers'

// ============================================================
// META OAUTH API
// Server-side OAuth flow para conectar Facebook Page e Instagram
// Business multi-tenant. Reemplaza el paste manual de token+page_id.
// Backend: meta_oauth_router.py
// ============================================================

export type MetaOAuthChannel = 'messenger' | 'instagram'

export interface MetaOAuthPage {
  id: string
  name: string
  category: string
  has_instagram: boolean
  instagram_business_account_id: string | null
}

/**
 * Start the Meta OAuth flow. The frontend should navigate the user to the
 * returned `authorize_url` (full-page redirect). Meta will redirect back to
 * the backend `/oauth2/meta/page/callback` which then redirects to the
 * dashboard with `?meta_oauth=select&channel=...&state=...`.
 */
export async function startMetaPageOAuth(channel: MetaOAuthChannel): Promise<string> {
  const res = await authFetch(`${API_URL}/oauth2/meta/page/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'No se pudo iniciar el flujo OAuth de Meta')
  }
  const data = await res.json() as { authorize_url: string }
  return data.authorize_url
}

/**
 * Decode a select_state JWT (set by the callback) and return the list of
 * Pages the user authorized — without exposing the Page Access Tokens to
 * the frontend.
 */
export async function listMetaPages(selectState: string): Promise<{
  channel: MetaOAuthChannel
  pages: MetaOAuthPage[]
}> {
  const res = await authFetch(`${API_URL}/oauth2/meta/page/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ select_state: selectState }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'No se pudieron listar las páginas')
  }
  return res.json()
}

/**
 * Finalize the OAuth flow: persist the chosen Page in the org config and
 * subscribe webhooks. Backend uses the Page Access Token from the signed
 * state — never exposes it to the frontend.
 */
export async function selectMetaPage(args: {
  selectState: string
  pageId: string
  channel: MetaOAuthChannel
  instagramBusinessAccountId?: string | null
}): Promise<{
  status: 'connected'
  channel: MetaOAuthChannel
  page_id: string
  page_name: string
  instagram_business_account_id: string | null
  webhook_subscribed: boolean
}> {
  const res = await authFetch(`${API_URL}/oauth2/meta/page/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      select_state: args.selectState,
      page_id: args.pageId,
      channel: args.channel,
      instagram_business_account_id: args.instagramBusinessAccountId || null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'No se pudo conectar la página')
  }
  return res.json()
}
