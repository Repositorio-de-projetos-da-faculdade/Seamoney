import * as THREE from 'three'
import { deckAt, HULL } from './hull'

// The hull livery, painted on a canvas with the same proportions as the hull side, so lettering is not stretched.
// The name is set in the landing page's display face, heavy and widely spaced like a painted hull name.

export const FONTS = {
  display: '"Funnel Display Variable", sans-serif',
  data: '"Geist Mono Variable", ui-monospace, monospace',
}

type Ctx = CanvasRenderingContext2D & { letterSpacing: string }

const LENGTH = HULL.bow - HULL.stern
const HEIGHT = HULL.deck + HULL.sheer + 0.8 - HULL.keel
const W = 4096
const PX = W / LENGTH
const H = Math.round(HEIGHT * PX)

/** Canvas x for hull length x, canvas y for height y (canvas y grows downwards). */
const cx = (x: number) => (x - HULL.stern) * PX
const cy = (y: number) => (HEIGHT - (y - HULL.keel)) * PX

function rand(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export function hullLivery() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d') as Ctx

  // topsides, boot top, antifouling
  g.fillStyle = '#0a2643'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#16100f'
  g.fillRect(0, cy(1.1), W, H)
  g.fillStyle = '#6e2320'
  g.fillRect(0, cy(-0.35), W, H)

  // brand sheer stripe, under the deck edge
  g.fillStyle = '#24e4b4'
  g.fillRect(0, cy(HULL.deck - 1.35), W, 0.42 * PX)

  // plating: faint weld seams
  g.fillStyle = 'rgba(0,0,0,0.16)'
  for (let x = HULL.stern + 6; x < HULL.bow; x += 9.5) g.fillRect(cx(x), 0, 2, cy(-0.35))
  for (const y of [3.5, 7, 10]) g.fillRect(0, cy(y), W, 2)

  // rust and water streaks running down from the deck edge and the scuppers
  const rnd = rand(9)
  for (let i = 0; i < 70; i++) {
    const x = cx(HULL.stern + 4 + rnd() * (LENGTH - 10))
    const top = cy(deckAt(HULL.stern + x / PX) - 1.6)
    const len = (2 + rnd() * 7) * PX
    const grad = g.createLinearGradient(0, top, 0, top + len)
    const rust = rnd() > 0.5
    grad.addColorStop(0, rust ? 'rgba(120,60,30,0.28)' : 'rgba(200,220,230,0.08)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(x, top, 2 + rnd() * 5, len)
  }

  // the name, midships, as large as the freeboard allows
  g.fillStyle = '#e9f1f5'
  g.textBaseline = 'alphabetic'
  g.textAlign = 'center'
  g.font = `800 ${Math.round(6.4 * PX)}px ${FONTS.display}`
  g.letterSpacing = `${Math.round(0.5 * PX)}px`
  g.fillText('SEAMONEY', cx(6), cy(3.1))

  // name at the bow, name and port of registry at the stern
  g.font = `800 ${Math.round(1.5 * PX)}px ${FONTS.display}`
  g.letterSpacing = `${Math.round(0.08 * PX)}px`
  g.fillText('SEAMONEY', cx(70), cy(HULL.deck - 3.4))
  g.fillText('SEAMONEY', cx(-78), cy(HULL.deck - 3.4))
  g.font = `600 ${Math.round(0.9 * PX)}px ${FONTS.data}`
  g.fillText('SANTOS', cx(-78), cy(HULL.deck - 5))

  // draft marks at bow and stern, every two metres above the keel
  g.font = `600 ${Math.round(0.75 * PX)}px ${FONTS.data}`
  g.textAlign = 'left'
  // kept clear of the names: forward of the bow name, aft of the stern name
  for (const x of [82, -92]) {
    for (let d = 12; d <= 22; d += 2) {
      const y = HULL.keel + d
      if (y > deckAt(x) - 4.4) break
      g.fillText(`${d}M`, cx(x), cy(y))
    }
  }

  // load line mark (Plimsoll disc) midships, and the bow thruster sign
  g.strokeStyle = '#e9f1f5'
  g.lineWidth = 0.12 * PX
  const disc = { x: cx(-40), y: cy(2.4), r: 1.1 * PX }
  g.beginPath()
  g.arc(disc.x, disc.y, disc.r, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#e9f1f5'
  g.fillRect(disc.x - 1.8 * PX, disc.y - 0.06 * PX, 3.6 * PX, 0.12 * PX)
  g.fillRect(disc.x + 2.6 * PX, disc.y - 1.6 * PX, 0.12 * PX, 3 * PX)
  for (const dy of [-1.6, -0.8, 0, 0.8]) g.fillRect(disc.x + 2.6 * PX, disc.y + dy * PX, 1.1 * PX, 0.12 * PX)
  const thr = { x: cx(80), y: cy(2.2), r: 0.9 * PX }
  g.beginPath()
  g.arc(thr.x, thr.y, thr.r, 0, Math.PI * 2)
  g.moveTo(thr.x - thr.r * 0.7, thr.y - thr.r * 0.7)
  g.lineTo(thr.x + thr.r * 0.7, thr.y + thr.r * 0.7)
  g.moveTo(thr.x + thr.r * 0.7, thr.y - thr.r * 0.7)
  g.lineTo(thr.x - thr.r * 0.7, thr.y + thr.r * 0.7)
  g.stroke()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}
