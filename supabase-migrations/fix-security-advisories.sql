-- Supabase Security Advisories Fix
-- Aja tämä Supabase Dashboard → SQL Editor:ssa
-- Korjaa 3 kriittistä tietoturvaongelmaa

-- Fix 1: shift_availability view käyttää SECURITY DEFINER
-- → Vaihdetaan SECURITY INVOKER:ksi (käyttää kyselyjän RLS-oikeuksia)
DROP VIEW IF EXISTS shift_availability;
CREATE VIEW shift_availability WITH (security_invoker = true) AS
SELECT
  s.id AS shift_id,
  s.task_id,
  s.team_name,
  s.start_time,
  s.end_time,
  s.max_participants,
  s.location,
  s.notes,
  COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed_count,
  COUNT(r.id) FILTER (WHERE r.status = 'confirmed' AND r.is_present = true) AS present_count,
  COUNT(r.id) FILTER (WHERE r.status = 'confirmed' AND r.is_present = false) AS no_show_count,
  s.max_participants - COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS available_spots
FROM shifts s
LEFT JOIN registrations r ON r.shift_id = s.id
GROUP BY s.id;

-- Fix 2: locations-taulussa ei ole RLS käytössä
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage locations" ON locations
  FOR ALL USING (auth.role() = 'authenticated');

-- Fix 3: email_queue-taulussa ei ole RLS käytössä
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email_queue" ON email_queue
  FOR ALL USING (auth.role() = 'authenticated');
