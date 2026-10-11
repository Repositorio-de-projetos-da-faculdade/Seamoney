import * as THREE from 'three'
import { HULL } from '../hull'
import { AIR_PIPES, BITTS, BREAKWATER, FOREMAST, FORECASTLE, HATCHES, HAWSE_X, hawseZ, inboard, MOORING, STOPPER_X, WINDLASS } from './layout'

// The forecastle deck as the camera sees it from above: green deck paint over welded plates, the walkways marked out
// in pale lanes, red-oxide machine beds under the windlasses and winches, the hatched yellow snap-back zones where a
// parting mooring line would whip, rust where the cables and the water run. Drawn on a canvas laid over the deck in
// plan (deckGeometry's UVs): x from FORECASTLE.paint to the stem left to right, starboard at the top.

const X0 = FORECASTLE.paint
const X1 = HULL.bow
const HALF = HULL.beam / 2

function rand(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export function forecastleDeck(W = 1536) {
  const PX = W / (X1 - X0)
  const H = Math.round(HULL.beam * PX)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const px = (x: number) => (x - X0) * PX
  const pz = (z: number) => (HALF - z) * PX
  const m = (v: number) => v * PX
  const rnd = rand(17)
  /** A rectangle in deck metres: centre and size. */
  const box = (x: number, z: number, dx: number, dz: number) => g.fillRect(px(x - dx / 2), pz(z + dz / 2), m(dx), m(dz))

  // deck paint, slightly patchy from years of touch-ups
  g.fillStyle = '#2f4a40'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '60,90,78' : '24,38,33'},${0.12 + rnd() * 0.18})`
    box(X0 + rnd() * (X1 - X0), (rnd() * 2 - 1) * HALF, 1.5 + rnd() * 5, 1 + rnd() * 3)
  }

  // welded plates: strakes running fore and aft, butts across them
  g.fillStyle = 'rgba(8,14,12,0.45)'
  for (let z = -HALF; z <= HALF; z += 2.4) g.fillRect(0, pz(z), W, Math.max(1, m(0.05)))
  for (let x = X0 + 3; x < X1; x += 8.2) g.fillRect(px(x), 0, Math.max(1, m(0.05)), H)

  // walkways: a lane up the centreline to the mast house, lanes out to the windlasses and round the bow
  const lane = (x0: number, z0: number, x1: number, z1: number, w = 1.1) => {
    g.save()
    g.translate(px(x0), pz(z0))
    g.rotate(Math.atan2(-(z1 - z0), x1 - x0))
    const len = m(Math.hypot(x1 - x0, z1 - z0))
    g.fillStyle = 'rgba(122,150,136,0.55)'
    g.fillRect(0, -m(w / 2), len, m(w))
    g.fillStyle = 'rgba(200,184,112,0.55)'
    g.fillRect(0, -m(w / 2), len, m(0.07))
    g.fillRect(0, m(w / 2) - m(0.07), len, m(0.07))
    g.restore()
  }
  lane(X0, 0, FOREMAST.x - 1.6, 0)
  for (const s of [1, -1]) {
    lane(FOREMAST.x + 1.6, 0, WINDLASS.x - 1.6, s * WINDLASS.inboardZ)
    lane(X0, s * (inboard(X0) - 1.2), BREAKWATER.feet - 0.6, s * (inboard(BREAKWATER.feet) - 1.2))
    lane(BREAKWATER.feet + 1.5, s * (inboard(BREAKWATER.feet + 1.5) - 1.2), 88, s * (inboard(88) - 1.2))
  }

  // red-oxide beds under the machinery, edged in safety yellow
  const bed = (x: number, z0: number, z1: number, dx: number) => {
    const z = (z0 + z1) / 2
    const dz = Math.abs(z1 - z0)
    g.fillStyle = '#4a2a22'
    box(x, z, dx, dz)
    g.strokeStyle = 'rgba(190,156,60,0.7)'
    g.lineWidth = m(0.09)
    g.strokeRect(px(x - dx / 2), pz(z + dz / 2), m(dx), m(dz))
  }
  for (const s of [1, -1]) {
    bed(WINDLASS.x, s * (WINDLASS.inboardZ - 0.4), s * (WINDLASS.gypsyZ + 1.3), 4.2)
    bed(MOORING.x, s * (MOORING.inboardZ - 0.4), s * (MOORING.outboardZ + 0.4), 3.4)
  }
  bed(FOREMAST.x, -1.8, 1.8, 3.8)

  // snap-back zones: hatched yellow where the lines from the winch drums lead out to the fairleads
  const hatched = (x: number, z: number, rx: number, rz: number, angle: number) => {
    g.save()
    g.translate(px(x), pz(z))
    g.rotate(angle)
    g.beginPath()
    g.ellipse(0, 0, m(rx), m(rz), 0, 0, Math.PI * 2)
    g.clip()
    g.strokeStyle = 'rgba(214,176,52,0.62)'
    g.lineWidth = m(0.16)
    for (let k = -m(rx + rz); k < m(rx + rz); k += m(0.6)) {
      g.beginPath()
      g.moveTo(k, -m(rz) * 2)
      g.lineTo(k + m(rz) * 2, m(rz) * 2)
      g.stroke()
    }
    g.restore()
    g.save()
    g.strokeStyle = 'rgba(214,176,52,0.8)'
    g.lineWidth = m(0.1)
    g.beginPath()
    g.ellipse(px(x), pz(z), m(rx), m(rz), angle, 0, Math.PI * 2)
    g.stroke()
    g.restore()
  }
  for (const s of [1, -1]) {
    hatched(MOORING.x - 0.2, s * (MOORING.outboardZ - 1.6), 2.6, 1.3, s * 0.5)
    hatched(WINDLASS.x + 2.6, s * (WINDLASS.gypsyZ + 2.4), 2.2, 1.1, -s * 0.35)
  }

  // the anchor cables wear the paint off between the stopper and the hawse pipe, and rust bleeds round the pipe
  for (const s of [1, -1] as const) {
    const z0 = s * WINDLASS.gypsyZ
    const z1 = hawseZ(s)
    const grad = g.createLinearGradient(px(WINDLASS.x), 0, px(HAWSE_X), 0)
    grad.addColorStop(0, 'rgba(120,70,40,0.1)')
    grad.addColorStop(1, 'rgba(140,76,40,0.5)')
    g.strokeStyle = grad
    g.lineWidth = m(1.1)
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(px(WINDLASS.x + 1), pz(z0))
    g.lineTo(px(STOPPER_X), pz((z0 + z1) / 2))
    g.lineTo(px(HAWSE_X), pz(z1))
    g.stroke()
    const rust = g.createRadialGradient(px(HAWSE_X), pz(z1), 0, px(HAWSE_X), pz(z1), m(2.2))
    rust.addColorStop(0, 'rgba(120,60,30,0.55)')
    rust.addColorStop(1, 'rgba(120,60,30,0)')
    g.fillStyle = rust
    g.fillRect(px(HAWSE_X - 2.2), pz(z1 + 2.2), m(4.4), m(4.4))
  }

  // rust round the fittings, and water stains running to the scuppers along the bulwark
  const stain = (x: number, z: number, r: number, a: number) => {
    const grad = g.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), m(r))
    grad.addColorStop(0, `rgba(110,58,30,${a})`)
    grad.addColorStop(1, 'rgba(110,58,30,0)')
    g.fillStyle = grad
    g.fillRect(px(x - r), pz(z + r), m(r * 2), m(r * 2))
  }
  for (const s of [1, -1]) {
    for (const x of [...BITTS, ...AIR_PIPES]) stain(x, s * (inboard(x) - 1.2), 1.3, 0.35)
    for (let x = X0 + 2; x < 90; x += 4.2) {
      g.fillStyle = 'rgba(10,16,14,0.8)'
      box(x, s * (inboard(x) - 0.15), 0.5, 0.25)
      stain(x, s * (inboard(x) - 0.5), 0.9 + rnd() * 0.6, 0.25)
    }
  }
  for (const [x, z] of HATCHES) stain(x, z, 1.6, 0.3)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}
