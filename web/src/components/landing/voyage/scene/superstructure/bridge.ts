import * as THREE from 'three'
import { HULL } from '../hull'
import { ACCOMMODATION } from '../stowage'
import { addCompassDeck } from './compassDeck'
import { createRadarMast } from './radarMast'
import { addWings } from './wings'

// The navigating bridge on top of the accommodation: a wheelhouse a little wider than the block, its front windows
// raked forward between a white bulkhead and fascia, mullions between the panes; the roof (the compass deck) is a
// painted deck with a white lip and a sun visor over the windows. The open wings and their cabs (wings.ts), the
// radar mast (radarMast.ts) and the gear on the roof (compassDeck.ts) are built on it.

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface Block {
  cx: number
  depth: number
  base: number
  blockH: number
}

/** Bulkhead, glass band, fascia: the three layers of a glazed deckhouse wall. */
export const LAYERS = { bulkhead: 1.05, glass: 1.45, fascia: 0.7 }
const HOUSE_H = LAYERS.bulkhead + LAYERS.glass + LAYERS.fascia
/** How far the top of the front windows leans out past their foot. */
const RAKE = 0.55
const SLAB = 0.3

export function createBridge(group: THREE.Group, keep: Keep, block: Block, mats: { steel: THREE.Material; rail: THREE.Material }, { detail }: { detail: boolean }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const white = keep(new THREE.MeshStandardMaterial({ color: '#c2cbd0', roughness: 0.65, metalness: 0.1 }))
  const trim = keep(new THREE.MeshStandardMaterial({ color: '#4c5960', roughness: 0.6, metalness: 0.35 }))
  const glass = keep(
    new THREE.MeshPhysicalMaterial({ color: '#0b2129', roughness: 0.06, metalness: 0.3, emissive: '#3a9aa6', emissiveIntensity: 0.16, clearcoat: 1 }),
  )

  const floor = block.base + block.blockH
  const houseW = ACCOMMODATION.width + 4
  const houseD = block.depth - 1.5
  const hx = block.cx - 0.3
  const front = hx + houseD / 2

  // wheelhouse: bulkhead all round, a glass band inset from it, the raked front panes and the fascia over them
  add(new THREE.BoxGeometry(houseD, LAYERS.bulkhead, houseW), white, hx, floor + LAYERS.bulkhead / 2, 0)
  add(new THREE.BoxGeometry(houseD - 0.25, LAYERS.glass, houseW - 0.25), glass, hx - 0.1, floor + LAYERS.bulkhead + LAYERS.glass / 2, 0)
  const lean = Math.atan2(RAKE, LAYERS.glass)
  const paneH = Math.hypot(RAKE, LAYERS.glass)
  const pane = add(new THREE.BoxGeometry(0.08, paneH, houseW - 0.1), glass, front + RAKE / 2, floor + LAYERS.bulkhead + LAYERS.glass / 2, 0)
  pane.rotation.z = -lean
  // the triangles between the raked front and the side glass, closed with plate
  for (const s of [1, -1]) {
    const cheek = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(RAKE, LAYERS.glass), new THREE.Vector2(0, LAYERS.glass)])
    const g = new THREE.ExtrudeGeometry(cheek, { depth: 0.1, bevelEnabled: false })
    add(g, white, front, floor + LAYERS.bulkhead, s * (houseW / 2) - (s > 0 ? 0.1 : 0))
  }
  add(new THREE.BoxGeometry(houseD + RAKE, LAYERS.fascia, houseW), white, hx + RAKE / 2, floor + LAYERS.bulkhead + LAYERS.glass + LAYERS.fascia / 2, 0)
  // mullions between the panes: raked across the front, upright down the sides
  if (detail) {
    for (let z = -houseW / 2 + 1.6; z < houseW / 2 - 1; z += 1.6) {
      const m = add(new THREE.BoxGeometry(0.12, paneH, 0.1), white, front + RAKE / 2 + 0.03, floor + LAYERS.bulkhead + LAYERS.glass / 2, z)
      m.rotation.z = -lean
    }
    for (const s of [1, -1]) {
      for (let x = hx - houseD / 2 + 1.3; x < front; x += 1.5) add(new THREE.BoxGeometry(0.1, LAYERS.glass, 0.12), white, x, floor + LAYERS.bulkhead + LAYERS.glass / 2, s * (houseW / 2 - 0.1))
    }
  }

  // the roof: a painted deck on a slab with a white lip, and a visor angled down over the front and side windows
  const roofD = houseD + RAKE + 0.6
  const roofW = houseW + 0.8
  const roofX = hx + RAKE / 2 + 0.15
  const top = floor + HOUSE_H + SLAB
  const deck = addCompassDeck(group, keep, { x0: roofX - roofD / 2, x1: roofX + roofD / 2, halfW: roofW / 2, y: top }, { white, trim, steel: mats.steel, rail: mats.rail, glass }, { detail })
  add(new THREE.BoxGeometry(roofD, SLAB, roofW), [white, white, deck.material, trim, white, white], roofX, top - SLAB / 2, 0)
  const visor = (len: number, x: number, z: number, yaw: number) => {
    const v = add(new THREE.BoxGeometry(1.1, 0.07, len), white, x, top - SLAB - 0.12, z)
    v.rotation.order = 'YXZ'
    v.rotation.y = yaw
    v.rotation.z = -0.22
  }
  visor(roofW, roofX + roofD / 2 + 0.45, 0, 0)
  for (const s of [1, -1]) visor(roofD - 1, roofX, s * (roofW / 2 + 0.45), (-s * Math.PI) / 2)

  const mast = createRadarMast(group, keep, { x: roofX - roofD / 2 + 2.4, roof: top, sband: front - 2.4 }, { white, trim, steel: mats.steel, rail: mats.rail }, { detail })
  const wingEnd = HULL.beam / 2 + 1.5
  addWings(group, keep, { x: hx, floor, houseW, houseD, wingEnd }, { white, trim, glass, rail: mats.rail }, { detail })

  return { floor, roof: top, mast: mast.light, wingEnd, scanners: mast.scanners }
}
