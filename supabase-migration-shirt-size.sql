-- Migraatio: Paidan koko -ominaisuus
-- Aja tämä Supabase SQL Editorissa

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS requires_shirt_size BOOLEAN DEFAULT false;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS shirt_size TEXT CHECK (shirt_size IN ('S', 'M', 'L', 'XL', 'XXL'));
