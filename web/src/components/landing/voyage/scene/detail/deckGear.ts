import * as THREE from 'three'
import { deckAt, halfBreadth, HULL } from '../hull'
import { FUNNEL_X } from '../stowage'
import { railing, rect } from './rail'

// What a real deck carries at its edges and ends: the railing along both sides, the solid bulwark round the
// forecastle, bollards and mooring winches aft and forward, and the rail round the engine casing. Railings are left
// out on phones (`rails`).

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface GearMaterials {
  rail: THREE.Material
  steel: THREE.Material
  hull: THREE.Material
  drum: THREE.Material
}

const FORECASTLE = 60

/** The deck edge on one side, from x0 to x1, a little inboard of the shell. */
function edge(side: 1 | -1, x0: number, x1: number, step = 2) {
  const pts: THREE.Vector3[] = []
  for (let x = x0; x <= x1; x += step) pts.push(new THREE.Vector3(x, deckAt(x), side * Math.max(halfBreadth(x, 1) - 0.35, 0.5)))
  return pts
}

/** The forecastle bulwark: a steel wall standing on the deck edge, flaring out a little, closing at the stem. */
function bulwarkGeometry() {
  const positions: number[] = []
  const indices: number[] = []
  const stem = 95
  const steps = 40
  for (const side of [1, -1]) {
    const base = positions.length / 3
    for (let i = 0; i <= steps; i++) {
      const x = FORECASTLE + (i / steps) * (stem - FORECASTLE)
      const z = side * Math.max(halfBreadth(x, 1), 0.02)
      const y = deckAt(x)
      positions.push(x, y - 0.2, z, x, y + 1.9, z * 1.015 + side * 0.15)
    }
    for (let i = 0; i < steps; i++) {
      const a = base + i * 2
      if (side === 1) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      else indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

export function addDeckGear(group: THREE.Group, keep: Keep, mats: GearMaterials, { rails }: { rails: boolean }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }

  if (rails) {
    // railing along both sides, from the stern to the forecastle bulwark, and across the stern
    for (const side of [1, -1] as const) railing(group, keep, mats.rail, edge(side, HULL.stern + 1.5, FORECASTLE + 1))
    const sternY = deckAt(HULL.stern + 1)
    const sternZ = halfBreadth(HULL.stern + 1, 1) - 0.35
    railing(group, keep, mats.rail, [new THREE.Vector3(HULL.stern + 0.6, sternY, -sternZ), new THREE.Vector3(HULL.stern + 0.6, sternY, sternZ)])
    // the engine casing around the funnel (superstructure/funnel.ts): its lower roof has a railing
    railing(group, keep, mats.rail, rect(FUNNEL_X - 6.6, FUNNEL_X + 10.6, -10.2, 10.2, deckAt(FUNNEL_X) + 3.4), { closed: true })
  }

  const wall = new THREE.Mesh(keep(bulwarkGeometry()), mats.hull)
  wall.castShadow = wall.receiveShadow = true
  group.add(wall)

  // mooring gear: pairs of bollards and winch drums, aft and forward
  const bollard = new THREE.CylinderGeometry(0.32, 0.36, 0.9, 12)
  const pairs: [number, number][] = [
    [-93.5, 7.5], [-93.5, -7.5], [-88.5, 10.5], [-88.5, -10.5], [-70, 15], [-70, -15], [52, 14.5], [52, -14.5], [84, 7], [84, -7],
  ]
  for (const [x, z] of pairs) {
    for (const dx of [-0.6, 0.6]) add(bollard.clone(), mats.steel, x + dx, deckAt(x) + 0.45, z)
  }
  bollard.dispose()
  for (const [x, z] of [[-90.5, 7], [-90.5, -7], [76, 3.2], [76, -3.2]] as [number, number][]) {
    const drum = add(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 16), mats.drum, x, deckAt(x) + 1, z)
    drum.rotation.x = Math.PI / 2
    add(new THREE.BoxGeometry(1.4, 1.2, 1.1), mats.steel, x, deckAt(x) + 0.6, z + Math.sign(z) * 1.7)
  }

}
