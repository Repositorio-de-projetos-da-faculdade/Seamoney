import * as THREE from 'three'
import { deckAt, HULL } from '../hull'
import { ACCOMMODATION, DECKHOUSE } from '../stowage'
import { railing, rect } from './rail'

// What makes the accommodation read as a ship's and not a building: an open walkway round every storey with its
// railing, the external stairs zigzagging down the aft face, the braces under the bridge wings, and the rescue boat
// on its davit. The railings are left out on phones (`rails`).

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface SuperstructureMaterials {
  rail: THREE.Material
  steel: THREE.Material
  white: THREE.Material
  boat: THREE.Material
}

const WALK = 1.15

export function addSuperstructureDetail(group: THREE.Group, keep: Keep, mats: SuperstructureMaterials, { rails }: { rails: boolean }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const { x0, x1 } = DECKHOUSE
  const { storeys, storey, width } = ACCOMMODATION
  const cx = (x0 + x1) / 2
  const depth = x1 - x0
  const base = deckAt(cx)
  const half = width / 2

  // a walkway round every storey, with its railing
  for (let k = 1; k < storeys; k++) {
    const y = base + k * storey
    add(new THREE.BoxGeometry(depth + WALK * 2, 0.16, width + WALK * 2), mats.white, cx, y - 0.08, 0)
    if (rails) railing(group, keep, mats.rail, rect(x0 - WALK + 0.1, x1 + WALK - 0.1, -half - WALK + 0.1, half + WALK - 0.1, y), { closed: true, pitch: 1.4 })
  }

  // external stairs down the aft face, starboard side: one flight per storey, alternating direction
  const run = 6
  const flight = Math.hypot(run, storey)
  for (let k = 0; k < storeys - 1; k++) {
    const yMid = base + (k + 0.5) * storey
    const zFrom = k % 2 === 0 ? 2.5 : 2.5 + run
    const zTo = k % 2 === 0 ? 2.5 + run : 2.5
    const stair = add(new THREE.BoxGeometry(0.95, 0.12, flight), mats.steel, x0 - WALK / 2, yMid, (zFrom + zTo) / 2)
    stair.rotation.x = Math.atan2(-storey, zTo - zFrom)
    // stringer handrail along the outside of the flight
    const rail = add(new THREE.BoxGeometry(0.05, 0.05, flight), mats.rail, x0 - WALK + 0.1, yMid + 0.95, (zFrom + zTo) / 2)
    rail.rotation.x = stair.rotation.x
  }

  // braces under the bridge wings, from the block's sides out to the wing ends
  const wingY = base + storeys * storey
  const wingEnd = HULL.beam / 2 + 1.2
  for (const s of [1, -1]) {
    for (const x of [cx - 3.5, cx + 2.5]) {
      const from = new THREE.Vector3(x, wingY - 5.5, s * half)
      const to = new THREE.Vector3(x, wingY, s * wingEnd)
      const len = from.distanceTo(to)
      const brace = add(new THREE.BoxGeometry(0.35, 0.35, len), mats.steel, (from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
      brace.lookAt(to.clone().add(group.position))
    }
  }

  // rescue boat on its davit, starboard side of the accommodation
  const boatY = base + 2 * storey + 1.4
  const boat = add(new THREE.CapsuleGeometry(1, 4.2, 6, 14), mats.boat, cx - 1, boatY, half + WALK + 1.4)
  boat.rotation.z = Math.PI / 2
  const arm = add(new THREE.BoxGeometry(0.3, 0.3, 3.2), mats.steel, cx - 1, boatY + 1.9, half + WALK + 0.6)
  arm.rotation.x = -0.35
}
