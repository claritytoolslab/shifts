-- Estää ylibuukkauksen käyttämällä FOR UPDATE -lukitusta race conditionin estämiseksi.
-- Olemassa oleva data ei muutu — triggeri koskee vain uusia INSERT-operaatioita.

CREATE OR REPLACE FUNCTION prevent_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  max_spots INTEGER;
  confirmed_count INTEGER;
BEGIN
  -- Lukitaan shift-rivi jotta samanaikaiset insertit jonoutuvat
  SELECT max_participants INTO max_spots
  FROM shifts
  WHERE id = NEW.shift_id
  FOR UPDATE;

  -- Lasketaan vahvistetut ilmoittautumiset
  SELECT COUNT(*) INTO confirmed_count
  FROM registrations
  WHERE shift_id = NEW.shift_id AND status = 'confirmed';

  IF NEW.status = 'confirmed' AND confirmed_count >= max_spots THEN
    RAISE EXCEPTION 'Vuoro on täynnä';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_overbooking_before_insert
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION prevent_overbooking();
