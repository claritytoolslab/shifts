// CSV-solun turvallinen muotoilu: lainausmerkit tuplataan ja kaavaksi
// tulkittavat arvot (=, @, tab, CR sekä +/- ilman numeroa perässä) saavat
// eteensä heittomerkin, jottei Excel suorita niitä. Puhelinnumerot (+358…)
// ja negatiiviset luvut säilyvät ennallaan.
export function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value)
  if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s(])/.test(s)) {
    s = `'${s}`
  }
  return `"${s.replace(/"/g, '""')}"`
}
