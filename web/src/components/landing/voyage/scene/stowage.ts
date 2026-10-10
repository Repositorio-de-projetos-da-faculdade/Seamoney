import { deckAt, halfBreadth } from './hull'

// Where everything sits on deck: bays of 40 ft containers forward and aft of the deckhouse, rows across the beam,
// tiers up from the hatch covers. The memo travels as 32 boxes of 20 ft on top of the four forward bays.

export const BOX40 = { l: 12.19, h: 2.59, w: 2.44 }
export const BOX20 = { l: 6.06, h: 2.59, w: 2.44 }
export const ROW_PITCH = 2.5
export const TIER_PITCH = 2.64
export const BAY_PITCH = 13

/** Deckhouse footprint along the length. */
export const DECKHOUSE = { x0: -17, x1: -5 }
/** Funnel and engine casing, aft. */
export const FUNNEL_X = -80

export interface Bay {
  x: number
  /** Top of the hatch cover the stack stands on. */
  base: number
  /** Rows per side of the centreline (the bay holds 2 * half rows). */
  half: number
  /** Tiers per row, from the centreline outwards. */
  tiers: number[]
}

const rowsFor = (x0: number, x1: number) => {
  const w = Math.min(halfBreadth(x0, 1), halfBreadth(x1, 1))
  return Math.max(0, Math.floor((w - 0.9) / ROW_PITCH))
}

// a skyline: stacks step down towards the bow, the stern and the ship's sides
const FORWARD = [7, 7, 7, 7, 5]
const AFT = [6, 7, 7, 6]

function bay(x: number, tiers: number): Bay {
  const half = rowsFor(x - BOX40.l / 2, x + BOX40.l / 2)
  return {
    x,
    base: Math.max(deckAt(x - 6), deckAt(x + 6)) + 1.1,
    half,
    tiers: Array.from({ length: half }, (_, r) => Math.max(1, tiers - Math.max(0, r - half + 3))),
  }
}

export const FORWARD_BAYS = FORWARD.map((t, k) => bay(DECKHOUSE.x1 + 1.6 + BOX40.l / 2 + k * BAY_PITCH, t))
export const AFT_BAYS = AFT.map((t, k) => bay(DECKHOUSE.x0 - 1.6 - BOX40.l / 2 - k * BAY_PITCH, t))
export const BAYS = [...AFT_BAYS, ...FORWARD_BAYS]

export const rowZ = (r: number, side: 1 | -1) => side * (r + 0.5) * ROW_PITCH
export const tierY = (b: Bay, tier: number) => b.base + tier * TIER_PITCH + BOX40.h / 2

/** The 32 memo slots: 8 along the length (two 20 ft per forward bay) by 4 rows, read like text from above. */
export const MEMO_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const col = i % 8
  const line = Math.floor(i / 8)
  const b = FORWARD_BAYS[Math.floor(col / 2)]
  const x = b.x + (col % 2 === 0 ? -1 : 1) * (BOX20.l / 2 + 0.035)
  const z = (line - 1.5) * ROW_PITCH
  return { x, z, y: tierY(b, b.tiers[0]), bay: b }
})

/** Rows (by distance from the centreline) that the memo tier covers: the inner two on each side. */
export const MEMO_ROWS = 2
