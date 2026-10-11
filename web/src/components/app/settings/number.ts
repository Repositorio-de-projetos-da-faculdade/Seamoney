/** Reads "5.40" or "5,40" as typed in either locale; null when it is not a finite number. */
export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

/** Reads a US dollar amount with optional thousands commas, like "10,000" or "2,500.5"; null when invalid. */
export function parseUsd(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '')
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(clean)) return null
  return Number(clean.replace(/,/g, ''))
}

const usdInput = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Shows a dollar amount with thousands separators, for the field when it loses focus. */
export function formatUsdInput(dollars: number): string {
  return usdInput.format(dollars)
}
