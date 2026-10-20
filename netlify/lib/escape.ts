// Escapoi tekstin HTML:ään lisättäväksi. Käytä kaikelle käyttäjän syöttämälle
// datalle (nimet jne.), jotta lomakkeeseen kirjoitettu HTML/JS ei päädy
// sähköposteihin tai sivuille koodina.
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
