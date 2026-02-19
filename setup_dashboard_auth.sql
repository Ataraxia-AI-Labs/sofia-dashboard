-- ============================================
-- ATARAXIA IA LABS — Dashboard Auth Tables
-- ============================================
-- Ejecutar en Supabase SQL Editor ANTES de usar el dashboard
--
-- Este script:
-- 1. Crea la tabla org_users (link user ↔ organization)
-- 2. Habilita RLS
-- 3. Crea el primer usuario admin

-- ============================================
-- 1. TABLA org_users
-- ============================================
CREATE TABLE IF NOT EXISTS org_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'VIEWER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un usuario solo puede estar una vez por org
    UNIQUE(user_id, organization_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_users_user ON org_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org ON org_users(organization_id);

-- RLS
ALTER TABLE org_users ENABLE ROW LEVEL SECURITY;

-- Política: un usuario solo ve sus propias membresías
CREATE POLICY "Users see own memberships"
    ON org_users FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- 2. RLS para organizations (lectura por miembros)
-- ============================================
-- Si aún no tienes RLS policy en organizations para dashboard:
-- (solo ejecutar si no existe ya)

-- CREATE POLICY "Members can read their org"
--     ON organizations FOR SELECT
--     USING (
--         id IN (
--             SELECT organization_id FROM org_users WHERE user_id = auth.uid()
--         )
--     );

-- ============================================
-- 3. CREAR PRIMER USUARIO
-- ============================================
-- PASO 1: Crea el usuario en Supabase Dashboard → Authentication → Users → Add User
--   Email: tu@email.com
--   Password: tu_password_seguro
--
-- PASO 2: Copia el UUID del usuario creado y ejecuta:
-- 
-- INSERT INTO org_users (user_id, organization_id, role) VALUES (
--     'UUID_DEL_USUARIO_DE_AUTH',
--     'UUID_DE_TU_ORGANIZACION',
--     'OWNER'
-- );
--
-- Ejemplo:
-- INSERT INTO org_users (user_id, organization_id, role) VALUES (
--     'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--     'tu-org-id-de-organizations',
--     'OWNER'
-- );
