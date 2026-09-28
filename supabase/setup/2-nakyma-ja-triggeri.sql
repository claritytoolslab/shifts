-- OSA 2/3: näkymä ja ylibuukkauksen esto. Aja osan 1 jälkeen.
-- ============================================================
-- Näkymä: vuoron täyttöaste
-- Ajetaan omistajan oikeuksin (oletus), jotta julkinen puoli näkee
-- paikkamäärät ilman pääsyä ilmoittautuneiden henkilötietoihin.
-- ============================================================
CREATE OR REPLACE VIEW public.shift_availability AS
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
FROM public.shifts s
JOIN public.tasks t ON t.id = s.task_id
JOIN public.events e ON e.id = t.event_id
LEFT JOIN public.registrations r ON r.shift_id = s.id
WHERE e.is_active = true OR auth.role() = 'authenticated'
GROUP BY s.id;

-- ============================================================
-- Ylibuukkauksen esto
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  max_spots INTEGER;
  confirmed_count INTEGER;
BEGIN
  -- Lukitaan vuororivi, jotta samanaikaiset insertit jonoutuvat
  SELECT max_participants INTO max_spots
  FROM public.shifts
  WHERE id = NEW.shift_id
  FOR UPDATE;

  SELECT COUNT(*) INTO confirmed_count
  FROM public.registrations
  WHERE shift_id = NEW.shift_id AND status = 'confirmed';

  IF NEW.status = 'confirmed' AND confirmed_count >= max_spots THEN
    RAISE EXCEPTION 'Vuoro on täynnä';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_overbooking_before_insert
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overbooking();

