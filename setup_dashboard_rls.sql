-- ============================================
-- ATARAXIA DASHBOARD — RLS Policies (Enterprise)
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Scope: Users can ONLY access data from their own organization(s)
--
-- PREREQUISITE: The org_users table must exist with columns:
--   user_id (uuid, references auth.users)
--   organization_id (uuid, references organizations)
--   role (text)
--
-- IMPORTANT: Run this AFTER dropping the old permissive policies:
--   DROP POLICY IF EXISTS "Dashboard reads patients" ON patients;
--   (repeat for each old policy...)

-- ============================================
-- HELPER: reusable function for org membership check
-- ============================================
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM org_users WHERE user_id = auth.uid()
$$;

-- ============================================
-- DROP old permissive policies (USING true)
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Dashboard %'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- ORGANIZATIONS — user can only see their own org
-- ============================================
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id IN (SELECT user_org_ids()));

CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id IN (SELECT user_org_ids()));

-- ============================================
-- PATIENTS — scoped to user's organization
-- ============================================
CREATE POLICY "patients_select" ON patients FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "patients_insert" ON patients FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "patients_update" ON patients FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- APPOINTMENTS
-- ============================================
CREATE POLICY "appointments_select" ON appointments FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- DETECTED OPPORTUNITIES
-- ============================================
CREATE POLICY "opportunities_select" ON detected_opportunities FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "opportunities_update" ON detected_opportunities FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- PATIENT ML FEATURES
-- ============================================
CREATE POLICY "ml_features_select" ON patient_ml_features FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- ACTIVE TREATMENTS
-- ============================================
CREATE POLICY "treatments_select" ON active_treatments FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "treatments_insert" ON active_treatments FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "treatments_update" ON active_treatments FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- STAFF NOTES (scoped via patient's org)
-- ============================================
CREATE POLICY "staff_notes_select" ON staff_notes FOR SELECT
  USING (patient_id IN (
    SELECT id FROM patients WHERE organization_id IN (SELECT user_org_ids())
  ));

CREATE POLICY "staff_notes_insert" ON staff_notes FOR INSERT
  WITH CHECK (patient_id IN (
    SELECT id FROM patients WHERE organization_id IN (SELECT user_org_ids())
  ));

-- ============================================
-- SERVICES CATALOG
-- ============================================
CREATE POLICY "services_select" ON services_catalog FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "services_insert" ON services_catalog FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "services_update" ON services_catalog FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- BUSINESS HOURS
-- ============================================
CREATE POLICY "hours_select" ON business_hours FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "hours_update" ON business_hours FOR UPDATE
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- INTERACTION LOGS
-- ============================================
CREATE POLICY "interaction_logs_select" ON interaction_logs FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- DATA LAKE RAW
-- ============================================
CREATE POLICY "data_lake_select" ON data_lake_raw FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- PAYMENTS
-- ============================================
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- ORG USERS (user can see their own membership)
-- ============================================
CREATE POLICY "org_users_select" ON org_users FOR SELECT
  USING (user_id = auth.uid());
