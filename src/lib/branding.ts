// Sivustokohtainen brändäys. Jokaisella yhdistyksellä on oma Netlify-sivusto,
// jonka ympäristömuuttujat määräävät näytettävän nimen.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Vuorovaraus'

export type Qualification = 'pelinohjauskoulutus' | 'ea1' | 'ajokortti' | 'jarjestyksenvalvontakortti'

interface FormConfig {
  qualifications: Qualification[]
  notesPlaceholder: string
  showTeamSelection: boolean
  showConfirmCheckbox: boolean
}

// Ilmoittautumislomakkeen sivustokohtaiset erot (VITE_FORM_PROFILE).
const FORM_PROFILES: Record<string, FormConfig> = {
  default: {
    qualifications: ['pelinohjauskoulutus', 'ea1', 'ajokortti', 'jarjestyksenvalvontakortti'],
    notesPlaceholder: 'Esim. Leivon mokkapaloja 2 peltiä',
    showTeamSelection: true,
    showConfirmCheckbox: true,
  },
  kotko: {
    qualifications: ['ea1'],
    notesPlaceholder: 'Kerro tähän mitä palkintoja tuot tai tuot buffaan',
    showTeamSelection: false,
    showConfirmCheckbox: false,
  },
}

export const FORM_CONFIG = FORM_PROFILES[import.meta.env.VITE_FORM_PROFILE ?? ''] ?? FORM_PROFILES.default
