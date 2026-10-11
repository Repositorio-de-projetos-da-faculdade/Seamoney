import { deckAt, halfBreadth } from '../hull'

// Where everything stands on the forecastle, shared by the painted deck (deckPaint.ts) and the gear on it, so the
// painted machine beds, walkways and chain wear line up with the machinery. x runs forward, +z is starboard.

/** The forecastle: the bulwark starts here, and the painted deck just forward of the last bay. */
export const FORECASTLE = { x0: 60, paint: 61.2, stem: 96 }

/** V-shaped breakwater: its feet at the ship's sides, its apex on the centreline, a little forward. */
export const BREAKWATER = { feet: 63.6, apex: 68.8, height: 4.2, reach: 0.9 }

/** Combined anchor windlass and mooring winch, one each side: the shaft runs across the ship. */
export const WINDLASS = { x: 79, gypsyZ: 5.7, inboardZ: 1.9 }

/** Mooring winches aft of the windlasses, just forward of the breakwater. */
export const MOORING = { x: 72.6, outboardZ: 10.2, inboardZ: 4.4 }

/** Foremast with its store house at the foot, on the centreline between the winches. */
export const FOREMAST = { x: 75.2, height: 12.5, platform: 9.2 }

/** Deck hawse pipes, where the anchor cables go down to the anchors in their pockets. */
export const HAWSE_X = 87.2
export const hawseZ = (side: 1 | -1) => side * (halfBreadth(HAWSE_X, 1) - 1.7)

/** Bow stopper on each cable, between the windlass and the hawse pipe. */
export const STOPPER_X = 83.6

/** Deck edge half breadth at x, inside the bulwark. */
export const inboard = (x: number, margin = 0.4) => Math.max(halfBreadth(x, 1) - margin, 0)

/** Double bitts along the bulwark and the fairleads (Panama chocks) in it, both sides. */
export const BITTS = [68.4, 77.4, 85.4]
export const CHOCKS = [70.2, 79.4, 88.6]

/** Forepeak store hatch, mushroom vents and goose-neck air pipes. */
export const HATCHES: [number, number][] = [[91, 0], [71.6, 1.6]]
export const VENTS: [number, number][] = [[89, 2.3], [89, -2.3], [71.4, -2.4], [82.6, 0]]
export const AIR_PIPES = [66.4, 74.2, 82]

/** Cable path of one anchor chain: up out of the spurling pipe, over the gypsy, the stopper, down the hawse pipe. */
export function cablePath(side: 1 | -1) {
  const z = side * WINDLASS.gypsyZ
  const deck = (x: number) => deckAt(x)
  const w = WINDLASS.x
  return [
    [w - 0.85, deck(w) + 0.2, z],
    [w - 0.8, deck(w) + 1.15, z],
    [w - 0.55, deck(w) + 1.85, z],
    [w - 0.05, deck(w) + 2.2, z],
    [w + 0.45, deck(w) + 2.1, z],
    [w + 1.3, deck(w + 1.3) + 1.55, z],
    [STOPPER_X, deck(STOPPER_X) + 0.95, z + (hawseZ(side) - z) * 0.5],
    [HAWSE_X - 0.4, deck(HAWSE_X) + 0.55, hawseZ(side)],
    [HAWSE_X + 0.3, deck(HAWSE_X) - 0.6, hawseZ(side)],
  ] as [number, number, number][]
}
