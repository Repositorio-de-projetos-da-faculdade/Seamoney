import * as THREE from 'three'
import { FUNNEL_X } from '../stowage'
import { railing, rect } from './rail'

// The funnel's working parts on top of the lofted funnel (superstructure/funnel.ts): exhaust uptakes standing proud
// of the top, a grating platform with its railing round them (not on phones), and the ladder up the casing's aft face.

type Keep = <T extends { dispose(): void }>(x: T) => T

export function addFunnelDetail(
  group: THREE.Group,
  keep: Keep,
  funnel: { top: number; cx: number },
  mats: { rail: THREE.Material; steel: THREE.Material; soot: THREE.Material },
  { rails }: { rails: boolean },
) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const { top, cx } = funnel

  // main engine and generator uptakes, of different bores and heights
  for (const [dx, z, r, h] of [[-0.6, -1.7, 0.75, 3.6], [-0.6, 1.7, 0.75, 3.6], [1.2, 0, 0.5, 2.8], [-2.2, 0, 0.42, 2.4]] as [number, number, number, number][]) {
    add(new THREE.CylinderGeometry(r, r * 1.04, h, 18), mats.soot, cx + dx, top + h / 2 - 0.4, z)
    add(new THREE.TorusGeometry(r, 0.08, 6, 18), mats.steel, cx + dx, top + h - 0.4, z).rotation.x = Math.PI / 2
  }

  // grating platform round the top, and its railing
  add(new THREE.BoxGeometry(8.6, 0.14, 9.6), mats.steel, cx, top + 0.05, 0)
  if (rails) railing(group, keep, mats.rail, rect(cx - 4.2, cx + 4.2, -4.7, 4.7, top + 0.12), { closed: true, pitch: 1.2, height: 1 })

  // ladder up the aft face of the upper casing
  const ladderX = FUNNEL_X - 6.1
  const foot = top - 16 - 6.4 + 3.4
  for (const z of [-0.35, 0.35]) add(new THREE.BoxGeometry(0.06, 3, 0.06), mats.rail, ladderX, foot + 1.5, z)
  for (let y = foot + 0.3; y < foot + 3; y += 0.3) add(new THREE.BoxGeometry(0.04, 0.04, 0.7), mats.rail, ladderX, y, 0)
}
