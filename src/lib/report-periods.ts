export function clipDate(a: string, b: string, lo: string, hi: string) {
  return { start: a > lo ? a : lo, end: b < hi ? b : hi }
}

export function semesterBounds(year: number, sem: 1 | 2): { start: string; end: string } {
  if (sem === 1) return { start: `${year}-01-01`, end: `${year}-06-30` }
  return { start: `${year}-07-01`, end: `${year}-12-31` }
}

export function monthsInRange(startYmd: string, endYmd: string) {
  const out: { key: string; label: string; start: string; end: string }[] = []
  const s = new Date(`${startYmd}T12:00:00`)
  const e = new Date(`${endYmd}T12:00:00`)
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e) {
    const y = cur.getFullYear()
    const m = cur.getMonth()
    const ms = new Date(y, m, 1).toISOString().slice(0, 10)
    const me = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    const { start, end } = clipDate(ms, me, startYmd, endYmd)
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    const label = `${String(m + 1).padStart(2, '0')}/${y}`
    out.push({ key, label, start, end })
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

export function semestersInRange(startYmd: string, endYmd: string) {
  const out: { key: string; label: string; start: string; end: string }[] = []
  const y1 = Number(startYmd.slice(0, 4))
  const y2 = Number(endYmd.slice(0, 4))
  for (let y = y1; y <= y2; y++) {
    for (const sem of [1, 2] as const) {
      const { start: ss, end: se } = semesterBounds(y, sem)
      if (se < startYmd || ss > endYmd) continue
      const { start, end } = clipDate(ss, se, startYmd, endYmd)
      out.push({
        key: `${y}-S${sem}`,
        label: `${y} · ${sem}º semestre`,
        start,
        end,
      })
    }
  }
  return out
}
