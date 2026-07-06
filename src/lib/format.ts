// ─── Formats suisses — identiques dans les trois langues ──────────────
// CHF 1'250'000 (apostrophe), dates JJ.MM.AAAA, décimales avec virgule (1,25%).
// Ne jamais formater à la main dans un composant : tout passe par ici.

/** Sépare les milliers par une apostrophe : 1250000 → "1'250'000". */
function thousands(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

/** Montant en francs suisses : formatCHF(1250000) → "CHF 1'250'000". */
export function formatCHF(amount: number, decimals = 0): string {
  const sign = amount < 0 ? '−' : ''
  const abs = Math.abs(amount)
  const [int, frac] = abs.toFixed(decimals).split('.')
  const body = frac ? `${thousands(int!)},${frac}` : thousands(int!)
  return `CHF ${sign}${body}`
}

/** Taux en pourcent, virgule décimale : formatRate(1.25) → "1,25%". */
export function formatRate(rate: number, decimals = 2): string {
  return `${rate.toFixed(decimals).replace('.', ',')}%`
}

/** Nombre avec virgule décimale et milliers en apostrophe. */
export function formatNumber(n: number, decimals = 0): string {
  const sign = n < 0 ? '−' : ''
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.')
  return `${sign}${thousands(int!)}${frac ? `,${frac}` : ''}`
}

/** Date au format suisse : JJ.MM.AAAA. */
export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}
