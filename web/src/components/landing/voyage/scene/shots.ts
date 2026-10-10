// Camera shots for each chapter, as plain numbers so GSAP can tween between them. They depend on the viewport
// aspect: the top-down cargo shot backs off on narrow screens so the whole memo stays in frame.

export interface Shot {
  px: number
  py: number
  pz: number
  tx: number
  ty: number
  tz: number
  ux: number
  uy: number
  uz: number
  fov: number
  /** Distance the ship has sailed forward (finale). */
  sail: number
}

type V3 = [number, number, number]

const shot = (p: V3, t: V3, fov: number, up: V3 = [0, 1, 0], sail = 0): Shot => ({
  px: p[0],
  py: p[1],
  pz: p[2],
  tx: t[0],
  ty: t[1],
  tz: t[2],
  ux: up[0],
  uy: up[1],
  uz: up[2],
  fov,
  sail,
})

/** Centre of the memo tier along the ship, and its top. */
const MEMO_X = 22
const MEMO_TOP = 22

export function shots(aspect: number) {
  const narrow = aspect < 0.9
  // top-down: fit a width of deck to the horizontal field of view; on desktop, the ship sits below the headline
  const fov = 34
  const tanH = Math.tan((fov * Math.PI) / 360) * aspect
  const width = narrow ? 62 : 128
  const height = MEMO_TOP + width / 2 / tanH

  return {
    hero: narrow ? shot([-360, 52, 290], [10, 34, -10], 44) : shot([-300, 34, 210], [-34, 50, -40], 30),
    cargo: shot([MEMO_X, height, narrow ? -4 : -5], [MEMO_X, 0, narrow ? -4 : -5], fov, [0, 0, -1]),
    speed: narrow ? shot([240, 22, 250], [0, 24, 0], 42) : shot([190, 13, 140], [-10, 22, -15], 30),
    away: shot([300, 200, 360], [0, 0, 0], 34),
    finale: narrow ? shot([-330, 40, 80], [160, 18, -30], 42, [0, 1, 0], 170) : shot([-300, 26, 70], [180, 22, -50], 30, [0, 1, 0], 170),
  }
}
