-- Vuorovaraus-sovelluksen Supabase-schema
-- Aja tämä Supabase SQL Editorissa

-- Tapahtumat
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tehtävät (globaaleja, ei joukkuesidontaa – vuorot sidotaan joukkueeseen)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_age INTEGER,
  requires_pelinohjauskoulutus BOOLEAN DEFAULT false,
  requires_ea1 BOOLEAN DEFAULT false,
  requires_ajokortti BOOLEAN DEFAULT false,
  requires_jarjestyksenvalvontakortti BOOLEAN DEFAULT false,
  other_requirements TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sijainnit (tapahtuma-kohtaiset: kaupunki, katu, numero)
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_event_id ON locations(event_id);

-- Vuorot (team_name = null → yleinen, team_name = joukkueen nimi → joukkuekohtainen)
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  team_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ilmoittautumiset
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  ssn TEXT NOT NULL, -- henkilötunnus (tallennetaan salattuna tuotannossa)
  has_pelinohjauskoulutus BOOLEAN DEFAULT false,
  has_ea1 BOOLEAN DEFAULT false,
  has_ajokortti BOOLEAN DEFAULT false,
  has_jarjestyksenvalvontakortti BOOLEAN DEFAULT false,
  notes TEXT,
  cancellation_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlisted')),
  is_present BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksit suorituskykyä varten
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_shifts_task_id ON shifts(task_id);
CREATE INDEX idx_registrations_shift_id ON registrations(shift_id);
CREATE INDEX idx_events_is_active ON events(is_active);

-- Näkymä: vuoro täyttöaste (sisältää team_name)
-- security_invoker = true: käyttää kyselyjän RLS-oikeuksia, ei view-omistajan
CREATE OR REPLACE VIEW shift_availability WITH (security_invoker = true) AS
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

-- RLS (Row Level Security) - Sallitaan julkinen luku tapahtumille, tehtäville, vuoroille
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Julkinen lukupolitiikka (kaikki voivat lukea aktiiviset tapahtumat)
CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = tasks.event_id AND e.is_active = true)
  );

CREATE POLICY "Public can view shifts" ON shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN events e ON e.id = t.event_id
      WHERE t.id = shifts.task_id AND e.is_active = true
    )
  );

-- Rekisteröityneet käyttäjät voivat lisätä ilmoittautumisia
CREATE POLICY "Anyone can create registrations" ON registrations
  FOR INSERT WITH CHECK (true);

-- Admineille täydet oikeudet (autentikoitu käyttäjä)
CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tasks" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage shifts" ON shifts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all registrations" ON registrations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update registrations" ON registrations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage locations" ON locations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage email_queue" ON email_queue
  FOR ALL USING (auth.role() = 'authenticated');

-- Funktio: tarkista onko vuorossa tilaa
CREATE OR REPLACE FUNCTION check_shift_availability(shift_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_spots INTEGER;
  confirmed INTEGER;
BEGIN
  SELECT s.max_participants, COUNT(r.id)
  INTO max_spots, confirmed
  FROM shifts s
  LEFT JOIN registrations r ON r.shift_id = s.id AND r.status = 'confirmed'
  WHERE s.id = shift_id
  GROUP BY s.max_participants;

  RETURN (max_spots - confirmed) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Esimerkkidata (poista tuotannossa)
INSERT INTO events (name, description, start_date, end_date, location) VALUES
(
  'Kesätapahtuma 2025',
  'Vuotuinen kesätapahtuma, jossa tarvitaan runsaasti vapaaehtoisia.',
  '2025-07-15',
  '2025-07-17',
  'Helsinki, Kaisaniemen puisto'
),
(
  'Syysmarkkinat 2025',
  'Perinteiset syysmarkkinat kaupungin torilla.',
  '2025-09-20',
  '2025-09-21',
  'Tampere, Keskustori'
);
