import * as THREE from 'three'
import { railing, rect } from '../detail/rail'

// The compass deck, the roof of the wheelhouse, as the camera sees it from above: grey-green deck paint over its
// plates with a dark gutter round the edge and painted walkways, its railing, the satellite radomes on pedestals,
// the standard magnetic compass, GNSS and AIS mushrooms, whip antennas, two air-conditioning condensers with their
// fans, searchlights at the front corners, the access hatch and the cable trays from the mast. The radar mast
// stands on it too (radarMast.ts), so the layout keeps clear of the S-band scanner's sweep.

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface Roof {
  /** Aft and forward edges, half width and the deck height. */
  x0: number
  x1: number
  halfW: number
  y: number
}

/** The painted roof, mapped onto the top face of a box: canvas left is aft, canvas top is port. */
function roofPaint(roof: Roof, hatch: [number, number], mast: number, W = 1024) {
  const D = roof.x1 - roof.x0
  const B = roof.halfW * 2
  const PX = W / D
  const H = Math.round(B * PX)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const px = (x: number) => (x - roof.x0) * PX
  const pz = (z: number) => (z + roof.halfW) * PX
  const m = (v: number) => v * PX

  g.fillStyle = '#7a8a84'
  g.fillRect(0, 0, W, H)
  // plates, and a darker gutter all round where the water runs to the drains
  g.fillStyle = 'rgba(20,28,26,0.35)'
  for (let z = -roof.halfW + 2.2; z < roof.halfW; z += 2.2) g.fillRect(0, pz(z), W, Math.max(1, m(0.04)))
  for (let x = roof.x0 + 3.6; x < roof.x1; x += 3.6) g.fillRect(px(x), 0, Math.max(1, m(0.04)), H)
  g.strokeStyle = 'rgba(22,30,30,0.7)'
  g.lineWidth = m(0.7)
  g.strokeRect(m(0.35), m(0.35), W - m(0.7), H - m(0.7))
  // weathering: a few darker patches, rust under the fittings' feet
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(40,48,46,${0.08 + ((i * 37) % 10) / 80})`
    g.fillRect(((i * 397) % 1000) / 1000 * W, ((i * 619) % 1000) / 1000 * H, m(0.6 + (i % 5) * 0.5), m(0.4 + (i % 3) * 0.4))
  }
  // walkways from the hatch to the mast ladder and round the radar pedestal
  g.fillStyle = 'rgba(150,170,160,0.45)'
  g.fillRect(px(mast - 1.4), pz(-0.5), px(hatch[0]) - px(mast - 1.4), m(1))
  g.fillRect(px(hatch[0]) - m(0.5), pz(Math.min(hatch[1], 0) - 0.5), m(1), m(Math.abs(hatch[1]) + 1))
  g.strokeStyle = 'rgba(200,184,112,0.6)'
  g.lineWidth = m(0.07)
  g.strokeRect(px(mast - 1.4), pz(-0.5), px(hatch[0]) - px(mast - 1.4), m(1))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

export function addCompassDeck(
  group: THREE.Group,
  keep: Keep,
  roof: Roof,
  mats: { white: THREE.Material; trim: THREE.Material; steel: THREE.Material; rail: THREE.Material; glass: THREE.Material },
  { detail }: { detail: boolean },
) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const { x0, x1, halfW, y } = roof
  const mast = x0 + 2.4
  const hatch: [number, number] = [x0 + 5.6, -5.6]

  if (detail) railing(group, keep, mats.rail, rect(x0 + 0.35, x1 - 0.35, -halfW + 0.35, halfW - 0.35, y), { closed: true, pitch: 1.4 })

  // satellite radomes on pedestals at the aft corners, a small broadband dome beside one
  for (const z of [-8, 8]) {
    add(new THREE.CylinderGeometry(0.2, 0.26, 1.5, 10), mats.steel, x0 + 1.4, y + 0.75, z)
    add(new THREE.BoxGeometry(1.4, 0.1, 1.4), mats.steel, x0 + 1.4, y + 1.5, z)
    add(new THREE.SphereGeometry(0.95, 24, 16), mats.white, x0 + 1.4, y + 2.35, z)
  }
  add(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), mats.steel, x0 + 1.2, y + 0.45, 4.4)
  add(new THREE.SphereGeometry(0.42, 16, 12), mats.white, x0 + 1.2, y + 1.15, 4.4)

  // GNSS, AIS and Navtex mushrooms on a rail along the aft edge
  add(new THREE.BoxGeometry(0.1, 0.1, 4.2), mats.steel, x0 + 0.8, y + 1.1, -3.6)
  for (const z of [-5.4, -4.2, -3, -1.9]) {
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), mats.steel, x0 + 0.8, y + 1.35, z)
    add(new THREE.CylinderGeometry(0.2, 0.16, 0.14, 12), mats.white, x0 + 0.8, y + 1.65, z)
  }

  // air-conditioning condensers: a cabinet each, two fans in its top
  for (const s of [1, -1]) {
    const cx = x0 + 6
    const cz = s * 10.4
    add(new THREE.BoxGeometry(2, 1, 1.1), mats.white, cx, y + 0.5, cz)
    for (const dx of [-0.48, 0.48]) {
      add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20), mats.trim, cx + dx, y + 1.01, cz)
      if (detail) add(new THREE.TorusGeometry(0.36, 0.035, 4, 20), mats.steel, cx + dx, y + 1.04, cz).rotation.x = Math.PI / 2
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), mats.steel, cx + dx, y + 1.04, cz)
    }
  }

  // searchlights on posts at the front corners, looking ahead
  for (const s of [1, -1]) {
    add(new THREE.CylinderGeometry(0.08, 0.1, 1, 8), mats.steel, x1 - 0.9, y + 0.5, s * (halfW - 0.9))
    const lamp = add(new THREE.CylinderGeometry(0.3, 0.26, 0.55, 14), mats.white, x1 - 0.85, y + 1.2, s * (halfW - 0.9))
    lamp.rotation.z = -Math.PI / 2
    const lens = add(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 14), mats.glass, x1 - 0.56, y + 1.2, s * (halfW - 0.9))
    lens.rotation.z = -Math.PI / 2
  }

  // the standard magnetic compass on the centreline, forward, its binnacle under a brass hood
  add(new THREE.CylinderGeometry(0.32, 0.4, 1.15, 14), mats.white, x1 - 1.3, y + 0.58, 0)
  add(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.steel, x1 - 1.3, y + 1.15, 0)

  // access hatch from the deck below
  add(new THREE.BoxGeometry(1.1, 0.5, 1.1), mats.white, hatch[0], y + 0.25, hatch[1])
  add(new THREE.BoxGeometry(1.25, 0.08, 1.25), mats.steel, hatch[0], y + 0.54, hatch[1])

  // whip antennas
  for (const [x, z, h] of [[x1 - 1.6, 11.6, 6], [x1 - 1.6, -11.6, 6], [x0 + 0.8, 6.3, 5], [x0 + 0.8, -6.6, 4.5]] as [number, number, number][]) {
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 6), mats.steel, x, y + 0.2, z)
    add(new THREE.CylinderGeometry(0.025, 0.045, h, 5), mats.rail, x, y + h / 2, z)
  }

  // cable trays on low stands, from the mast out to the radomes and forward to the radar pedestal
  if (detail) {
    for (const s of [1, -1]) add(new THREE.BoxGeometry(0.3, 0.08, 6.6), mats.steel, x0 + 1.9, y + 0.25, s * 4)
    const from = mast + 0.7
    const to = x1 - 4
    add(new THREE.BoxGeometry(to - from, 0.08, 0.3), mats.steel, (from + to) / 2, y + 0.25, 0.9)
  }

  // a faint glow of its own, as if from the mast's deck lamps, so the paint still reads from above at night
  const paint = keep(roofPaint(roof, hatch, mast, detail ? 1024 : 512))
  return { material: keep(new THREE.MeshStandardMaterial({ map: paint, emissive: '#ffffff', emissiveMap: paint, emissiveIntensity: 0.1, roughness: 0.85, metalness: 0.1 })) }
}
