# FIX: Login Spinner Infinito — Diagnóstico y Solución

## Problema
El login se queda en spinner infinito. El usuario existe (`ataraxia.ia.labs@tutamail.com`) pero nunca entra al dashboard.

---

## ROOT CAUSE: 3 Bugs Identificados

### Bug 1 — CRÍTICO: `handleLogin` sin try-catch
**Archivo:** `app/login/page.tsx` línea 21

`supabase.auth.signInWithPassword()` puede lanzar una excepción (error de red, Supabase inalcanzable, env vars mal configuradas). Si tira excepción, `setLoading(false)` NUNCA se ejecuta → spinner eterno.

**Código actual (roto):**
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (authError) {
    setError(
      authError.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : authError.message
    )
    setLoading(false)
    return
  }

  router.replace('/dashboard')
}
```

**Código corregido:**
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    console.log('[LOGIN] Attempting signInWithPassword for:', email.trim())
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      console.error('[LOGIN] Auth error:', authError.message, authError.status)
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : authError.message
      )
      setLoading(false)
      return
    }

    console.log('[LOGIN] Success — user:', data.user?.id, 'session:', !!data.session)
    router.replace('/dashboard')
  } catch (err) {
    console.error('[LOGIN] Unexpected error:', err)
    setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
    setLoading(false)
  }
}
```

---

### Bug 2 — CRÍTICO: Tabla incorrecta `org_users` vs `org_members`
**Archivo:** `lib/api.ts` función `fetchUserOrganization()`

El dashboard busca el usuario en la tabla `org_users`, pero el backend (onboarding_service.py línea 190) crea los registros en `org_members`. Si el usuario fue creado vía onboarding del backend, NO existe en `org_users` → dashboard dice "No se encontró organización".

**Código actual (roto):**
```typescript
export async function fetchUserOrganization(userId: string): Promise<{ organization: Organization | null; role: 'OWNER' | 'ADMIN' | 'VIEWER' }> {
  const { data, error } = await supabase
    .from('org_users')  // ← SOLO busca aquí
    .select('organization_id, role, organizations(id, name, status)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error) {
    console.error('No org_users mapping found for user:', userId, error.message)
    return { organization: null, role: 'VIEWER' }  // ← Falla silenciosamente
  }

  const role = (data?.role as 'OWNER' | 'ADMIN' | 'VIEWER') || 'VIEWER'
  return { organization: (data?.organizations as unknown as Organization | null) || null, role }
}
```

**Código corregido (intenta ambas tablas con fallback):**
```typescript
export async function fetchUserOrganization(userId: string): Promise<{ organization: Organization | null; role: 'OWNER' | 'ADMIN' | 'VIEWER' }> {
  console.log('[ORG] Fetching organization for user:', userId)

  // Try org_users first (has RLS configured for anon key), then org_members
  const { data, error } = await supabase
    .from('org_users')
    .select('organization_id, role, organizations(id, name, status)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!error && data) {
    console.log('[ORG] Found via org_users:', data.organization_id, 'role:', data.role)
    const role = (data.role as 'OWNER' | 'ADMIN' | 'VIEWER') || 'VIEWER'
    return { organization: (data.organizations as unknown as Organization | null) || null, role }
  }

  console.warn('[ORG] org_users lookup failed:', error?.message, '— trying org_members...')

  // Fallback: try org_members (backend canonical table — may lack RLS for anon key)
  const { data: membersData, error: membersError } = await supabase
    .from('org_members')
    .select('organization_id, role, is_active, organizations(id, name, status)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (membersError) {
    console.error('[ORG] Both org_users and org_members failed for user:', userId, membersError.message)
    return { organization: null, role: 'VIEWER' }
  }

  console.log('[ORG] Found via org_members:', membersData?.organization_id, 'role:', membersData?.role)
  const role = (membersData?.role as 'OWNER' | 'ADMIN' | 'VIEWER') || 'VIEWER'
  return { organization: (membersData?.organizations as unknown as Organization | null) || null, role }
}
```

---

### Bug 3 — Zero diagnóstico en dashboard layout
**Archivo:** `app/dashboard/layout.tsx` función `init()` dentro del `useEffect`

Si `getSession()` falla o `fetchUserOrganization()` tira error, no hay ningún log que diga qué pasó. El dashboard simplemente muestra spinner o "No se encontró organización" sin explicar por qué.

**Código actual:**
```typescript
useEffect(() => {
  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.replace('/login')
      return
    }

    setUser(session.user)

    try {
      const { organization, role: userRole } = await fetchUserOrganization(session.user.id)
      setOrg(organization)
      setRole(userRole)
    } catch (e) {
      console.error('Error fetching org:', e)
    }

    setLoading(false)
  }

  init()
```

**Código corregido:**
```typescript
useEffect(() => {
  const init = async () => {
    console.log('[DASHBOARD] init — checking session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('[DASHBOARD] getSession error:', sessionError.message)
    }

    if (!session) {
      console.warn('[DASHBOARD] No session found — redirecting to /login')
      router.replace('/login')
      return
    }

    console.log('[DASHBOARD] Session OK — user:', session.user.id, 'email:', session.user.email)
    setUser(session.user)

    try {
      console.log('[DASHBOARD] Fetching user organization...')
      const { organization, role: userRole } = await fetchUserOrganization(session.user.id)
      console.log('[DASHBOARD] Org result:', organization?.id, organization?.name, 'role:', userRole)
      setOrg(organization)
      setRole(userRole)
    } catch (e) {
      console.error('[DASHBOARD] Error fetching org:', e)
    }

    setLoading(false)
    console.log('[DASHBOARD] Init complete — loading=false')
  }

  init()
```

---

## Acción inmediata en Supabase SQL Editor

Antes de deployar los fixes de código, verifica si el usuario tiene registro en las tablas:

```sql
-- 1. Buscar el user_id del email en Supabase Auth
SELECT id, email FROM auth.users
WHERE email = 'ataraxia.ia.labs@tutamail.com';

-- 2. Ver si existe en org_users (tabla que usa el dashboard)
SELECT * FROM org_users WHERE user_id = '<UUID_DEL_PASO_1>';

-- 3. Ver si existe en org_members (tabla que usa el backend)
SELECT * FROM org_members WHERE user_id = '<UUID_DEL_PASO_1>';

-- 4. Si está en org_members pero NO en org_users, copiar:
INSERT INTO org_users (user_id, organization_id, role)
SELECT user_id, organization_id, role
FROM org_members
WHERE user_id = '<UUID_DEL_PASO_1>';

-- 5. Si NO está en NINGUNA tabla, insertar manualmente:
-- Primero busca tu org_id:
SELECT id, name FROM organizations LIMIT 5;
-- Luego inserta:
-- INSERT INTO org_users (user_id, organization_id, role)
-- VALUES ('<UUID_USUARIO>', '<UUID_ORGANIZACION>', 'OWNER');
--
-- INSERT INTO org_members (user_id, organization_id, role, is_active)
-- VALUES ('<UUID_USUARIO>', '<UUID_ORGANIZACION>', 'OWNER', true);
```

---

## Resumen de archivos a modificar

| Archivo | Qué cambiar |
|---------|-------------|
| `app/login/page.tsx` | Envolver `signInWithPassword()` en try-catch + console.logs |
| `lib/api.ts` | `fetchUserOrganization()` buscar en org_users Y org_members con fallback |
| `app/dashboard/layout.tsx` | Agregar console.logs en init() para diagnóstico |

---

## Contexto adicional

El backend (Session 18) ahora requiere JWT en TODOS los endpoints del dashboard (43+ endpoints). El dashboard ya envía Bearer token vía `authFetch()` en `lib/supabase.ts` — esto funciona correctamente porque usa `session.access_token`. NO hay que cambiar `authFetch()`.

El archivo completo de sincronización backend↔dashboard está en `DASHBOARD_SYNC_INSTRUCTIONS.md` en el repo del backend.
