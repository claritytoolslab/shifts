# Vuorovaraus

Täysimittainen vapaaehtoistoimijoiden vuorovaraussovellus.

## Ominaisuudet

### Käyttäjäpuoli (ei kirjautumista)
- Valitse tapahtuma dropdown-valikosta tai tapahtumakorteista
- Selaa tehtäviä ja niiden vuoroja
- Näe paikkatilanne reaaliajassa
- Ilmoittaudu vuoroon: nimi, puhelin, email, henkilötunnus, pätevyydet

### Admin-puoli (kirjautuminen vaaditaan)
- Hallintapaneeli tilastoilla
- Luo/muokkaa/poista tapahtumia (aktiivinen/piilotettu)
- Luo/muokkaa tehtäviä: nimi, kuvaus, ikäraja, vaatimukset (B-kortti, Tieturva, hygieniapassi)
- Luo vuoroja tehtäville: aika, paikkojen määrä, sijainti
- Näytä/hallitse ilmoittautumisia per vuoro
- Hae ja suodata ilmoittautumisia
- Vie CSV-tiedostona

## Käyttöönotto

### 1. Supabase-projektin luonti

1. Mene [supabase.com](https://supabase.com) ja luo uusi projekti
2. Aja `supabase/schema.sql` SQL Editorissa (koko ajantasainen skeema: taulut, näkymä, ylibuukkauksen esto ja RLS)
3. Kopioi projektin URL, anon-avain ja service role -avain

> Juuren `supabase-schema.sql` ja `supabase-migration-*.sql` ovat vanhoja migraatioita olemassa olevalle kannalle. Uuteen projektiin käytä `supabase/schema.sql`-tiedostoa.

### 2. Ympäristömuuttujat

Kopioi `.env.example` → `.env.local` ja täytä:
```
VITE_APP_NAME=Vuorovaraus          # Sivuston nimi otsikoissa ja sähköpostien oletuslähettäjänä
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Netlify-funktioille (sähköpostit, peruutus)
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=noreply@...
SITE_URL=https://sivusto.netlify.app
```

### 3. Paikallinen kehitys

```bash
npm install --cache /tmp/npm-cache
npm run dev
```

### 4. Netlify-deploy

1. Ota projekti käyttöön Netlifyssa (GitHub-yhteys tai drag & drop `dist/`)
2. Lisää ympäristömuuttujat Netlify-asetuksiin
3. Build command: `npm run build`, Publish directory: `dist`

### 5. Admin-käyttäjän luonti

Luo käyttäjä Supabase-konsolissa:
- Authentication → Users → Add user
- Tai käytä Supabase SQL Editoria:
```sql
-- Luo admin-käyttäjä Supabase Authenticationin kautta
```

## Uuden yhdistyksen käyttöönotto

Jokaisella yhdistyksellä on sama koodi, mutta oma Supabase-projekti (oma data ja admin-tunnukset) ja oma Netlify-sivusto.

1. Luo yhdistykselle Supabase-projekti ja aja siinä `supabase/schema.sql`.
2. Luo admin-käyttäjät: Authentication → Users → Add user.
3. Netlifyssä: Add new site → Import from GitHub → tämä repo.
4. Aseta sivuston ympäristömuuttujat yhdistyksen omilla arvoilla (ks. yllä), esim. `VITE_APP_NAME=Kotko`.
5. Supabase → Authentication → URL Configuration: Site URL = sivuston osoite.

Koodimuutokset päivittyvät kaikille sivustoille, kun ne deployataan samasta haarasta.

## Teknologiat

- React 18 + TypeScript
- Vite 5
- Supabase (PostgreSQL + Auth)
- Tailwind CSS 3
- React Router 6
- React Hook Form
- date-fns
- lucide-react

## Rakenne

```
src/
├── components/
│   ├── AdminLayout.tsx       # Admin-sivupalkki ja pohja
│   └── RegistrationModal.tsx # Ilmoittautumislomake
├── contexts/
│   └── AuthContext.tsx       # Supabase-autentikaatio
├── lib/
│   ├── supabase.ts           # Supabase-asiakas
│   └── database.types.ts     # TypeScript-tyypit
├── pages/
│   ├── HomePage.tsx          # Etusivu, tapahtumalista
│   ├── EventPage.tsx         # Tapahtuman tehtävät ja vuorot
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── AdminDashboard.tsx
│       ├── AdminEvents.tsx
│       ├── AdminEventDetail.tsx
│       └── AdminRegistrations.tsx
└── App.tsx                   # Reittimääritykset
```
