import * as THREE from 'three'
import { HULL } from '../hull'

// A normal map for the hull shell, on the same canvas layout as the livery (hullLivery in livery.ts): the welded
// seams between plates and strakes, and the slight dish of every plate between its frames (the "hungry horse" look
// of a real hull under a low light). Drawn at full width for the pre-rendered frames, half width on a live page.

const LENGTH = HULL.bow - HULL.stern
const HEIGHT = HULL.deck + HULL.sheer + 0.8 - HULL.keel

const FRAME = 0.8
const PLATE = 9.5
const STRAKES = [3.5, 7, 10]

/** Height of the shell surface (in arbitrary units) at hull length x and height y above the keel. */
function surface(x: number, y: number) {
  const dish = -0.5 * (1 - Math.cos((2 * Math.PI * x) / FRAME))
  const f = (((x - HULL.stern - 6) % PLATE) + PLATE) % PLATE
  const seam = (dist: number) => Math.exp(-(dist * dist) / 0.004)
  const seamX = seam(Math.min(f, PLATE - f))
  const seamY = STRAKES.reduce((sum, s) => sum + seam(y - (s - HULL.keel)), 0)
  return dish * 0.33 + (seamX + seamY) * 0.5
}

export function hullPlating(W = 4096) {
  const PX = W / LENGTH
  const H = Math.round(HEIGHT * PX)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const img = g.createImageData(W, H)
  const d = 1 / PX
  for (let py = 0; py < H; py++) {
    // canvas rows run down from the deck edge; height above the keel runs up
    const y = HEIGHT - py / PX
    for (let px = 0; px < W; px++) {
      const x = HULL.stern + px / PX
      const dx = (surface(x + d, y) - surface(x - d, y)) / (2 * d)
      const dy = (surface(x, y + d) - surface(x, y - d)) / (2 * d)
      const len = Math.hypot(dx * 0.02, dy * 0.02, 1)
      const i = (py * W + px) * 4
      img.data[i] = ((-dx * 0.02) / len) * 127 + 128
      img.data[i + 1] = ((-dy * 0.02) / len) * 127 + 128
      img.data[i + 2] = (1 / len) * 127 + 128
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 16
  return t
}
