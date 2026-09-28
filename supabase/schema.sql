-- Vuorovaraus: täydellinen tietokantaskeema uudelle yhdistykselle / Supabase-projektille.
-- Aja tämä kerran tyhjän projektin SQL Editorissa (tai Supabase MCP:n apply_migration-työkalulla).
-- Vastaa src/lib/database.types.ts -tiedostoa. Ei esimerkkidataa.

-- ============================================================
-- Taulut
-- ============================================================

-- Tapahtumat
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  privacy_contact TEXT,
  privacy_retention TEXT,
  confirmation_email_subject TEXT,
  confirmation_email_body TEXT,
  sender_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tehtävät
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_age INTEGER,
  requires_pelinohjauskoulutus BOOLEAN NOT NULL DEFAULT false,
  requires_ea1 BOOLEAN NOT NULL DEFAULT false,
  requires_ajokortti BOOLEAN NOT NULL DEFAULT false,
  requires_jarjestyksenvalvontakortti BOOLEAN NOT NULL DEFAULT false,
  requires_shirt_size BOOLEAN NOT NULL DEFAULT false,
  other_requirements TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sijainnit (tapahtumakohtaiset)
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vuorot (team_name = null → yleinen, muuten joukkuekohtainen)
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  team_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  notes TEXT,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kategoriat ja joukkueet (globaalit listat)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ilmoittautumiset
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  has_pelinohjauskoulutus BOOLEAN NOT NULL DEFAULT false,
  has_ea1 BOOLEAN NOT NULL DEFAULT false,
  has_ajokortti BOOLEAN NOT NULL DEFAULT false,
  has_jarjestyksenvalvontakortti BOOLEAN NOT NULL DEFAULT false,
  shirt_size TEXT CHECK (shirt_size IN ('S', 'M', 'L', 'XL', 'XXL')),
  notes TEXT,
  team_selection TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlisted')),
  gdpr_accepted BOOLEAN NOT NULL DEFAULT false,
  is_under_13 BOOLEAN NOT NULL DEFAULT false,
  guardian_phone TEXT,
  is_present BOOLEAN NOT NULL DEFAULT false,
  cancellation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sähköpostijono (vahvistukset ja muistutukset)
CREATE TABLE email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- ============================================================
-- Indeksit
-- ============================================================
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_locations_event_id ON locations(event_id);
CREATE INDEX idx_shifts_task_id ON shifts(task_id);
CREATE INDEX idx_shifts_location_id ON shifts(location_id);
CREATE INDEX idx_registrations_shift_id ON registrations(shift_id);
CREATE UNIQUE INDEX idx_registrations_cancellation_token ON registrations(cancellation_token);
CREATE INDEX idx_email_queue_registration_id ON email_queue(registration_id);

-- ============================================================
-- Näkymä: vuoron täyttöaste
-- Ajetaan omistajan oikeuksin (oletus), jotta julkinen puoli näkee
-- paikkamäärät ilman pääsyä ilmoittautuneiden henkilötietoihin.
-- ============================================================
CREATE OR REPLACE VIEW shift_availability AS
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
JOIN tasks t ON t.id = s.task_id
JOIN events e ON e.id = t.event_id
LEFT JOIN registrations r ON r.shift_id = s.id
WHERE e.is_active = true OR auth.role() = 'authenticated'
GROUP BY s.id;

-- ============================================================
-- Ylibuukkauksen esto
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  max_spots INTEGER;
  confirmed_count INTEGER;
BEGIN
  -- Lukitaan vuororivi, jotta samanaikaiset insertit jonoutuvat
  SELECT max_participants INTO max_spots
  FROM shifts
  WHERE id = NEW.shift_id
  FOR UPDATE;

  SELECT COUNT(*) INTO confirmed_count
  FROM registrations
  WHERE shift_id = NEW.shift_id AND status = 'confirmed';

  IF NEW.status = 'confirmed' AND confirmed_count >= max_spots THEN
    RAISE EXCEPTION 'Vuoro on täynnä';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_overbooking_before_insert
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION prevent_overbooking();

-- ============================================================
-- RLS
-- Julkinen (anon) puoli: lukee aktiiviset tapahtumat ja niiden tehtävät,
-- vuorot ja sijainnit sekä joukkue- ja kategorialistat, ja voi lisätä
-- ilmoittautumisen. Ilmoittautumisia se ei voi lukea.
-- Kirjautunut admin: täydet oikeudet. Netlify-funktiot käyttävät
-- service role -avainta, joka ohittaa RLS:n.
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Julkinen luku
CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view tasks of active events" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = tasks.event_id AND e.is_active = true)
  );

CREATE POLICY "Public can view locations of active events" ON locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = locations.event_id AND e.is_active = true)
  );

CREATE POLICY "Public can view shifts of active events" ON shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN events e ON e.id = t.event_id
      WHERE t.id = shifts.task_id AND e.is_active = true
    )
  );

CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Public can view teams" ON teams
  FOR SELECT USING (true);

-- Julkinen ilmoittautuminen: vain vahvistettu ilmoittautuminen aktiivisen tapahtuman vuoroon
CREATE POLICY "Public can create registrations" ON registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM shifts s
      JOIN tasks t ON t.id = s.task_id
      JOIN events e ON e.id = t.event_id
      WHERE s.id = registrations.shift_id AND e.is_active = true
    )
  );

-- Adminit (kirjautuneet käyttäjät): täydet oikeudet
CREATE POLICY "Admins manage events" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage tasks" ON tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage locations" ON locations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage shifts" ON shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage categories" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage teams" ON teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage registrations" ON registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage email queue" ON email_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Data API -oikeudet (jos "Automatically expose new tables" oli pois päältä)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON events, tasks, locations, shifts, categories, teams, shift_availability TO anon;
GRANT INSERT ON registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON shift_availability TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
