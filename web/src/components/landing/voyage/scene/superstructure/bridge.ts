import * as THREE from 'three'
import { HULL } from '../hull'
import { ACCOMMODATION } from '../stowage'

// The navigating bridge on top of the accommodation: a wheelhouse a little wider than the block, glazed all round
// in a dark band between a white bulkhead and fascia, under a roof with a visor; open wings out to the ship's sides
// with their bulwarks and a small glazed cab at each end; the radar mast and its scanners on the roof.

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface Block {
  cx: number
  depth: number
  base: number
  blockH: number
}

/** Bulkhead, glass band, fascia: the three layers of a glazed deckhouse wall. */
const LAYERS = { bulkhead: 1.05, glass: 1.45, fascia: 0.7 }
const HOUSE_H = LAYERS.bulkhead + LAYERS.glass + LAYERS.fascia

export function createBridge(group: THREE.Group, keep: Keep, block: Block, mats: { steel: THREE.Material }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
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

  /** A glazed box: bulkhead, a slightly inset glass band and the fascia, with its floor at y. */
  const glazed = (d: number, w: number, x: number, y: number, z: number, layers = LAYERS) => {
    add(new THREE.BoxGeometry(d, layers.bulkhead, w), white, x, y + layers.bulkhead / 2, z)
    add(new THREE.BoxGeometry(d - 0.25, layers.glass, w - 0.25), glass, x, y + layers.bulkhead + layers.glass / 2, z)
    add(new THREE.BoxGeometry(d, layers.fascia, w), white, x, y + layers.bulkhead + layers.glass + layers.fascia / 2, z)
  }

  const floor = block.base + block.blockH
  const houseW = ACCOMMODATION.width + 4
  const houseD = block.depth - 1.5
  const hx = block.cx - 0.3

  // wheelhouse and its roof with a visor over the windows
  glazed(houseD, houseW, hx, floor, 0)
  add(new THREE.BoxGeometry(houseD + 1.4, 0.32, houseW + 1.2), trim, hx + 0.3, floor + HOUSE_H + 0.16, 0)

  // open wings out to the ship's sides: deck, bulwarks fore and aft and at the end, and a glazed cab at each end
  const wingEnd = HULL.beam / 2 + 1.5
  const wingD = houseD - 2.4
  for (const s of [1, -1]) {
    const z0 = houseW / 2
    const len = wingEnd - z0
    const mid = s * (z0 + len / 2)
    add(new THREE.BoxGeometry(wingD, 0.3, len), white, hx, floor + 0.15, mid)
    for (const dx of [-wingD / 2, wingD / 2]) add(new THREE.BoxGeometry(0.16, 1.1, len), white, hx + dx, floor + 0.85, mid)
    glazed(3.2, 2.4, hx + 0.8, floor + 0.3, s * (wingEnd - 1.2), { bulkhead: 1, glass: 1.1, fascia: 0.45 })
    add(new THREE.BoxGeometry(3.6, 0.2, 2.8), trim, hx + 0.8, floor + 0.3 + 2.65, s * (wingEnd - 1.2))
  }

  // radar mast on the roof: a column, a yard, two scanners and the masthead light pole
  const roof = floor + HOUSE_H + 0.32
  const mx = hx - 1.5
  add(new THREE.CylinderGeometry(0.28, 0.4, 9, 8), mats.steel, mx, roof + 4.5, 0)
  add(new THREE.BoxGeometry(0.3, 0.3, 8), mats.steel, mx, roof + 6.5, 0)
  const scanners = [
    add(new THREE.BoxGeometry(0.35, 0.22, 5.5), white, mx, roof + 7.2, 2.6),
    add(new THREE.BoxGeometry(0.35, 0.22, 4.2), white, mx, roof + 7.2, -2.6),
  ]
  add(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), mats.steel, mx, roof + 11, 0)

  return { floor, roof, mast: { x: mx, top: roof + 11.2 }, wingEnd, scanners }
}
