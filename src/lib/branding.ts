// Sivustokohtainen brändäys. Jokaisella yhdistyksellä on oma Netlify-sivusto,
// jonka ympäristömuuttujat määräävät näytettävän nimen.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Vuorovaraus'
