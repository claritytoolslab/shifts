-- OSA 4: syötteiden pituus- ja muotorajat ilmoittautumisille.
-- Turvallinen ajaa olemassa olevaan kantaan:
--  * ei muuta eikä poista yhtään riviä
--  * NOT VALID = vanhoja rivejä ei tarkisteta, rajat koskevat uusia ja muokattuja rivejä
--  * voi ajaa uudelleen (vanha rajoite poistetaan ensin, jos se on jo olemassa)
-- Rajat ovat väljät, jotta yksikään oikea ilmoittautuminen ei hylkäänny.

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_first_name_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_first_name_len
  CHECK (char_length(first_name) <= 200) NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_last_name_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_last_name_len
  CHECK (char_length(last_name) <= 200) NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_email_format;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_email_format
  CHECK (char_length(email) <= 320 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+$') NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_phone_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_phone_len
  CHECK (char_length(phone) <= 50) NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_guardian_phone_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_guardian_phone_len
  CHECK (guardian_phone IS NULL OR char_length(guardian_phone) <= 50) NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_notes_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_notes_len
  CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_team_selection_len;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_team_selection_len
  CHECK (team_selection IS NULL OR char_length(team_selection) <= 200) NOT VALID;
