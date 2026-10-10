import * as THREE from 'three'
import { deckAt, HULL } from '../hull'

// The free-fall lifeboat over the stern: an enclosed orange boat with its canopy and window band, nose down on a
// launching ramp that runs out over the transom, held up by a steel frame.

type Keep = <T extends { dispose(): void }>(x: T) => T

/** The ramp runs from the aft face of the engine casing (funnel.ts) out to a lip over the transom. */
const RAMP = { top: HULL.stern + 9, lip: HULL.stern + 0.5, rise: 6.4, drop: 2.6 }

export function createLifeboat(group: THREE.Group, keep: Keep, mats: { steel: THREE.Material }) {
  const deck = deckAt(HULL.stern + 5)
  const top = new THREE.Vector3(RAMP.top, deck + RAMP.rise, 0)
  const lip = new THREE.Vector3(RAMP.lip, deck + RAMP.drop, 0)
  const along = lip.clone().sub(top)
  const length = along.length()
  // rising towards +x (inboard), so the lip over the stern is the low end
  const angle = Math.atan2(-along.y, -along.x)

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    parent.add(m)
    return m
  }

  // the ramp: two rails on a frame of legs down to the deck
  const ramp = new THREE.Group()
  ramp.position.copy(top.clone().add(lip).multiplyScalar(0.5))
  ramp.rotation.z = angle
  group.add(ramp)
  for (const z of [-1.3, 1.3]) add(new THREE.BoxGeometry(length, 0.35, 0.3), mats.steel, ramp, 0, 0, z)
  for (let i = 0; i <= 4; i++) add(new THREE.BoxGeometry(0.25, 0.25, 2.9), mats.steel, ramp, -length / 2 + (i / 4) * length, -0.1, 0)
  for (const t of [0.5, 0.92]) {
    const p = top.clone().lerp(lip, t)
    for (const z of [-1.3, 1.3]) add(new THREE.BoxGeometry(0.3, p.y - deck, 0.3), mats.steel, group, p.x, (p.y + deck) / 2, z)
  }

  // the boat: hull, canopy and a dark window band, nose pointing down the ramp
  const orange = keep(new THREE.MeshStandardMaterial({ color: '#f26b1d', roughness: 0.42, emissive: '#f26b1d', emissiveIntensity: 0.06 }))
  const glass = keep(new THREE.MeshStandardMaterial({ color: '#111a1f', roughness: 0.2, metalness: 0.4 }))
  const boat = new THREE.Group()
  boat.position.copy(top.clone().lerp(lip, 0.45))
  boat.position.y += 1.5
  boat.rotation.z = angle
  group.add(boat)
  const hull = add(new THREE.CapsuleGeometry(1, 6.4, 8, 20), orange, boat, 0, 0, 0)
  hull.rotation.z = Math.PI / 2
  hull.scale.set(1.15, 1, 1.25)
  const canopy = add(new THREE.CapsuleGeometry(0.85, 4.2, 8, 20), orange, boat, 0.6, 0.85, 0)
  canopy.rotation.z = Math.PI / 2
  canopy.scale.set(1, 1, 1.1)
  const band = add(new THREE.CapsuleGeometry(0.88, 3.2, 6, 20), glass, boat, 0.9, 1, 0)
  band.rotation.z = Math.PI / 2
  band.scale.set(0.45, 1, 1.12)
}
