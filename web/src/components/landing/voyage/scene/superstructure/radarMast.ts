import * as THREE from 'three'
import { railing, rect } from '../detail/rail'

// The radar mast on the compass deck: a square column with a ladder up its back, a railed platform on top carrying
// the masthead light pole, a signal yard with its lamps, the air whistle, and two radars: the X-band scanner on a
// platform cantilevered forward and the larger S-band scanner on its own pedestal at the front of the roof. The
// scanners turn (deckhouse.ts), so each is a group kept out of the static merge.

type Keep = <T extends { dispose(): void }>(x: T) => T

const COLUMN = 7.5

export function createRadarMast(
  group: THREE.Group,
  keep: Keep,
  at: { x: number; roof: number; sband: number },
  mats: { white: THREE.Material; trim: THREE.Material; steel: THREE.Material; rail: THREE.Material },
  { detail }: { detail: boolean },
) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    parent.add(m)
    return m
  }
  const { x, roof } = at

  // the column, square, tapering a little
  const column = add(new THREE.CylinderGeometry(0.42, 0.62, COLUMN, 4), mats.white, x, roof + COLUMN / 2, 0)
  column.rotation.y = Math.PI / 4
  // top platform with its railing, and the masthead light pole
  const top = roof + COLUMN
  add(new THREE.BoxGeometry(2.3, 0.14, 2.3), mats.steel, x, top, 0)
  if (detail) railing(group, keep, mats.rail, rect(x - 1.1, x + 1.1, -1.1, 1.1, top + 0.07), { closed: true, pitch: 0.75, height: 0.9 })
  add(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 8), mats.steel, x - 0.5, top + 1.8, 0)
  // signal yard across the column, lamps at its ends
  add(new THREE.BoxGeometry(0.2, 0.2, 7.4), mats.white, x, roof + 6.5, 0)
  for (const z of [-3.5, -2.2, 2.2, 3.5]) add(new THREE.BoxGeometry(0.28, 0.32, 0.28), mats.trim, x, roof + 6.25, z)
  // the air whistle, two horns on the forward face
  for (const z of [-0.25, 0.25]) {
    const horn = add(new THREE.CylinderGeometry(0.16, 0.05, 0.9, 10), mats.steel, x + 0.85, roof + 4.4, z)
    horn.rotation.z = -Math.PI / 2
  }
  if (detail) {
    for (const z of [-0.25, 0.25]) add(new THREE.BoxGeometry(0.05, COLUMN, 0.05), mats.rail, x - 0.72, roof + COLUMN / 2, z)
    for (let y = roof + 0.3; y < top; y += 0.32) add(new THREE.BoxGeometry(0.04, 0.04, 0.5), mats.rail, x - 0.72, y, 0)
  }

  /** A slotted-array scanner on its turning unit: a group that turns about its own y axis. */
  const scanner = (length: number, px: number, py: number) => {
    const unit = new THREE.Group()
    unit.position.set(px, py, 0)
    group.add(unit)
    add(new THREE.BoxGeometry(0.85, 0.5, 0.6), mats.trim, 0, 0.25, 0, unit)
    add(new THREE.BoxGeometry(0.36, 0.32, length), mats.white, 0.08, 0.68, 0, unit)
    add(new THREE.BoxGeometry(0.06, 0.24, length - 0.2), mats.trim, 0.27, 0.68, 0, unit)
    return unit
  }

  // X-band on a platform cantilevered forward off the column, braced underneath
  const xband = roof + 5.2
  add(new THREE.BoxGeometry(2.9, 0.12, 1.5), mats.steel, x + 1.9, xband, 0)
  for (const z of [-0.6, 0.6]) {
    const strut = add(new THREE.BoxGeometry(2.64, 0.1, 0.1), mats.steel, x + 1.52, xband - 0.83, z)
    strut.rotation.z = 0.62
  }
  const x1 = scanner(3.8, x + 2.6, xband + 0.06)

  // S-band on its own pedestal at the front of the roof
  add(new THREE.CylinderGeometry(0.3, 0.42, 2.4, 10), mats.white, at.sband, roof + 1.2, 0)
  add(new THREE.BoxGeometry(1.1, 0.12, 1.1), mats.steel, at.sband, roof + 2.4, 0)
  const s1 = scanner(4.6, at.sband, roof + 2.46)

  return { scanners: [s1, x1], light: { x: x - 0.5, top: top + 3.8 } }
}
