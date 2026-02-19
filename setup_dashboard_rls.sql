-- ============================================
-- ATARAXIA DASHBOARD — RLS Policies (Operativo)
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Habilita lectura y escritura desde el dashboard

-- LECTURA
CREATE POLICY IF NOT EXISTS "Dashboard reads patients" ON patients FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads opportunities" ON detected_opportunities FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads ml_features" ON patient_ml_features FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads treatments" ON active_treatments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads staff_notes" ON staff_notes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads services" ON services_catalog FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads hours" ON business_hours FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard reads orgs" ON organizations FOR SELECT USING (true);

-- ESCRITURA
CREATE POLICY IF NOT EXISTS "Dashboard creates patients" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates patients" ON patients FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates appointments" ON appointments FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates opportunities" ON detected_opportunities FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard creates treatments" ON active_treatments FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates treatments" ON active_treatments FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard creates notes" ON staff_notes FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Dashboard creates services" ON services_catalog FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates services" ON services_catalog FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates hours" ON business_hours FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard updates orgs" ON organizations FOR UPDATE USING (true);

-- Additional for v4 features
CREATE POLICY IF NOT EXISTS "Dashboard reads interaction_logs" ON interaction_logs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Dashboard creates appointments" ON appointments FOR INSERT WITH CHECK (true);
