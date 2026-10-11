// Browser copy of rules-api Pricing.java, used only by the self-contained SaaS demo (/app), which runs without the
// Java service. Keep the two in step: same integer cents, same half-up fee rounding (see pricing.test.ts and PricingTest).
import type { Quote } from './types.ts'

export const FEE_BPS = 100

/** Half-up rounding of amount * bps / 10_000 in integer arithmetic, like Pricing.feeCents. */
export function feeCents(amountCents: number, feeBps: number): number {
  return Math.floor((amountCents * feeBps + 5_000) / 10_000)
}

/** What the importer is assumed to pay today by bank wire. An estimate, never a quote. */
export function bankCostCents(amountCents: number, bankFeePct: number): number {
  return Math.round((amountCents * bankFeePct) / 100)
}

/** Simulated FX: USD cents to BRL cents. Always labelled "simulated" in the UI. */
export function usdToBrlCents(usdCents: number, rate: number): number {
  return Math.round(usdCents * rate)
}

/** USD cents to TIP-20 base units (6 decimals), as a string because it passes the JS safe integer. */
export function centsToUnits(cents: number): string {
  if (cents < 0 || !Number.isInteger(cents)) throw new Error('cents must be a non-negative integer')
  return (BigInt(cents) * 10_000n).toString()
}

export function quote(amountCents: number, opts: { feeBps: number; bankFeePct: number; fxRate: number }): Quote {
  const fee = feeCents(amountCents, opts.feeBps)
  const total = amountCents + fee
  const bank = bankCostCents(amountCents, opts.bankFeePct)
  return {
    amountCents,
    feeBps: opts.feeBps,
    feeCents: fee,
    totalCents: total,
    bankFeePct: opts.bankFeePct,
    bankCostCents: bank,
    savingsCents: bank - fee,
    fxRate: opts.fxRate,
    totalBrlCents: usdToBrlCents(total, opts.fxRate),
  }
}

/** Monthly comparison for the calculator: same shape as POST /api/compare. */
export function compare(amountCents: number, bankFeePct: number, feeBps = FEE_BPS) {
  const bankCents = bankCostCents(amountCents, bankFeePct)
  const routeCents = feeCents(amountCents, feeBps)
  const savingsCents = bankCents - routeCents
  return { bankCents, routeCents, savingsCents, savingsShare: bankCents > 0 ? savingsCents / bankCents : 0, feeBps }
}
