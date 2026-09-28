-- OSA 1/3: taulut ja indeksit. Aja ensin.
-- ============================================================
-- Taulut
-- ============================================================

-- Tapahtumat
CREATE TABLE public.events (
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
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Tehtävät
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
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
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Sijainnit (tapahtumakohtaiset)
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Vuorot (team_name = null → yleinen, muuten joukkuekohtainen)
CREATE TABLE public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Kategoriat ja joukkueet (globaalit listat)
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Ilmoittautumiset
CREATE TABLE public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  has_pelinohjauskoulutus BOOLEAN NOT NULL DEFAULT false,
  has_ea1 BOOLEAN NOT NULL DEFAULT false,
  has_ajokortti BOOLEAN NOT NULL DEFAULT false,
  has_jarjestyksenvalvontakortti BOOLEAN NOT NULL DEFAULT false,
  shirt_size TEXT,
  notes TEXT,
  team_selection TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  gdpr_accepted BOOLEAN NOT NULL DEFAULT false,
  is_under_13 BOOLEAN NOT NULL DEFAULT false,
  guardian_phone TEXT,
  is_present BOOLEAN NOT NULL DEFAULT false,
  cancellation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_shirt_size_check
  CHECK (shirt_size IN ('S', 'M', 'L', 'XL', 'XXL'));
ALTER TABLE public.registrations ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'waitlisted'));

-- Sähköpostijono (vahvistukset ja muistutukset)
CREATE TABLE public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Indeksit
-- ============================================================
CREATE INDEX idx_events_is_active ON public.events(is_active);
CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX idx_locations_event_id ON public.locations(event_id);
CREATE INDEX idx_shifts_task_id ON public.shifts(task_id);
CREATE INDEX idx_shifts_location_id ON public.shifts(location_id);
CREATE INDEX idx_registrations_shift_id ON public.registrations(shift_id);
CREATE UNIQUE INDEX idx_registrations_cancellation_token ON public.registrations(cancellation_token);
CREATE INDEX idx_email_queue_registration_id ON public.email_queue(registration_id);

