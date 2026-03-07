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
2. Aja `supabase-schema.sql` SQL Editorissa
3. Kopioi projektin URL ja anon-avain

### 2. Ympäristömuuttujat

Kopioi `.env.example` → `.env.local` ja täytä:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
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
