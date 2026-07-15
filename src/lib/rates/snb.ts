import 'server-only'

// ─── Données publiques BNS (data.snb.ch) ───────────────────────────────
// SARON (fixing quotidien)         : cube `snbgwdzid`, dimension D0=SARON.
// Rendements Confédération / durée  : cube `rendoblid`, D0 = 2J,3J,…,10J0,15J.
// API CSV gratuite, sans clé. Robuste : renvoie null / partiel sans lever.

const API = 'https://data.snb.ch/api/cube'

// Codes de maturité BNS → durée en années.
const MATURITY: Record<string, number> = {
  '2J': 2,
  '3J': 3,
  '4J': 4,
  '5J': 5,
  '6J': 6,
  '7J': 7,
  '8J': 8,
  '9J': 9,
  '10J0': 10, // rendement au comptant 10 ans (10J1 = autre série)
  '15J': 15,
}

export interface SnbSnapshot {
  yieldsDate: string | null
  yields: Record<number, number> // par durée (années)
  saronDate: string | null
  saron: number | null
}

async function fetchCsv(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null // week-end, jour férié, réseau : silencieux (voir appelant)
  } finally {
    clearTimeout(timer)
  }
}

// Lignes utiles = "YYYY-MM-DD";"CODE";"VALUE" après l'en-tête.
function parseRows(csv: string): Array<{ date: string; code: string; value: number }> {
  const rows: Array<{ date: string; code: string; value: number }> = []
  for (const rawLine of csv.split('\n')) {
    // CRLF : on retire le \r AVANT de dénuder les guillemets, sinon le
    // guillemet fermant colle au \r et la valeur devient NaN.
    const line = rawLine.replace(/\r/g, '')
    const cells = line.split(';').map((c) => c.replace(/^"|"$/g, '').trim())
    if (cells.length < 3) continue
    const [date, code, raw] = cells
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const value = Number(raw)
    if (!Number.isFinite(value)) continue
    rows.push({ date, code: code!, value })
  }
  return rows
}

/** Rendements Confédération par date sur une fenêtre (durée → taux). */
async function fetchYields(from: string, to: string): Promise<Map<string, Record<number, number>>> {
  const csv = await fetchCsv(`${API}/rendoblid/data/csv/en?fromDate=${from}&toDate=${to}`)
  const byDate = new Map<string, Record<number, number>>()
  if (!csv) return byDate
  for (const { date, code, value } of parseRows(csv)) {
    const term = MATURITY[code]
    if (term == null) continue
    const rec = byDate.get(date) ?? {}
    rec[term] = value
    byDate.set(date, rec)
  }
  return byDate
}

/** SARON par date sur une fenêtre. */
async function fetchSaron(from: string, to: string): Promise<Map<string, number>> {
  const csv = await fetchCsv(`${API}/snbgwdzid/data/csv/en?dimSel=D0(SARON)&fromDate=${from}&toDate=${to}`)
  const byDate = new Map<string, number>()
  if (!csv) return byDate
  for (const { date, code, value } of parseRows(csv)) {
    if (code === 'SARON') byDate.set(date, value)
  }
  return byDate
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Dernier point disponible pour chaque série (leurs dates peuvent différer). */
export async function fetchLatestSnb(windowDays = 540): Promise<SnbSnapshot | null> {
  const to = iso(new Date())
  const from = iso(new Date(Date.now() - windowDays * 86_400_000))
  const [yieldsMap, saronMap] = await Promise.all([fetchYields(from, to), fetchSaron(from, to)])

  const yieldsDate = [...yieldsMap.keys()].sort().at(-1) ?? null
  const saronDate = [...saronMap.keys()].sort().at(-1) ?? null
  if (!yieldsDate && !saronDate) return null

  return {
    yieldsDate,
    yields: yieldsDate ? yieldsMap.get(yieldsDate)! : {},
    saronDate,
    saron: saronDate ? saronMap.get(saronDate)! : null,
  }
}

/** Série jour-par-jour sur une fenêtre (pour le backfill du graphique). Le
    SARON est reporté (last-known) sur les jours sans nouvelle valeur. */
export async function fetchSnbRange(
  windowDays: number
): Promise<Array<{ date: string; yields: Record<number, number>; saron: number | null }>> {
  const to = iso(new Date())
  const from = iso(new Date(Date.now() - windowDays * 86_400_000))
  const [yieldsMap, saronMap] = await Promise.all([fetchYields(from, to), fetchSaron(from, to)])

  const dates = [...yieldsMap.keys()].sort()
  const saronDates = [...saronMap.keys()].sort()
  let lastSaron: number | null = null
  let si = 0
  return dates.map((date) => {
    while (si < saronDates.length && saronDates[si]! <= date) {
      lastSaron = saronMap.get(saronDates[si]!)!
      si++
    }
    return { date, yields: yieldsMap.get(date)!, saron: lastSaron }
  })
}
