-- OSA 3/3: RLS-säännöt ja oikeudet. Aja viimeisenä.
-- ============================================================
-- RLS
-- Julkinen (anon) puoli: lukee aktiiviset tapahtumat ja niiden tehtävät,
-- vuorot ja sijainnit sekä joukkue- ja kategorialistat, ja voi lisätä
-- ilmoittautumisen. Ilmoittautumisia se ei voi lukea.
-- Kirjautunut admin: täydet oikeudet. Netlify-funktiot käyttävät
-- service role -avainta, joka ohittaa RLS:n.
-- ============================================================
-- Julkinen luku
CREATE POLICY "Public can view active events" ON public.events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view tasks of active events" ON public.tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = tasks.event_id AND e.is_active = true)
  );

CREATE POLICY "Public can view locations of active events" ON public.locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = locations.event_id AND e.is_active = true)
  );

CREATE POLICY "Public can view shifts of active events" ON public.shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = shifts.task_id AND e.is_active = true
    )
  );

CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Public can view teams" ON public.teams
  FOR SELECT USING (true);

-- Julkinen ilmoittautuminen: vain vahvistettu ilmoittautuminen aktiivisen tapahtuman vuoroon
CREATE POLICY "Public can create registrations" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM public.shifts s
      JOIN public.tasks t ON t.id = s.task_id
      JOIN public.events e ON e.id = t.event_id
      WHERE s.id = registrations.shift_id AND e.is_active = true
    )
  );

-- Adminit (kirjautuneet käyttäjät): täydet oikeudet
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage tasks" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage locations" ON public.locations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage shifts" ON public.shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage teams" ON public.teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage registrations" ON public.registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage email queue" ON public.email_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Data API -oikeudet (jos "Automatically expose new tables" oli pois päältä)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.events, public.tasks, public.locations, public.shifts, public.categories, public.teams, public.shift_availability TO anon;
GRANT INSERT ON public.registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.shift_availability TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
