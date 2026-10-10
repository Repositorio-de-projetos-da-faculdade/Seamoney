// UI input parsing only. Money RULES (fees, savings, conversion) live in the Java rules API.
// No imports on purpose: this file is unit-tested directly by `node --test`.

/** "80,000.50" | "80000.5" | "80.000,50" -> 8000050. Returns null when it is not a clear amount. */
export function parseMoneyToCents(input: string): number | null {
  const s = input.replace(/[^\d.,-]/g, '').trim()
  if (!s || s === '-') return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized: string
  if (lastComma > -1 && lastDot > -1) {
    // the later separator is the decimal one
    normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    // "80,50" is decimal, "80,000" is thousands: 1-2 digits after the comma means decimal
    normalized = s.length - lastComma - 1 <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else {
    normalized = s
  }
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}
