import * as THREE from 'three'

// The open bridge wings, out to the ship's sides: a deck with bulwarks fore and aft under a capping rail, the
// conning console and a gyro repeater on each, and at the end a small glazed cab with raked front windows, a roof
// with a visor and the sidelight housing on its outboard face.

type Keep = <T extends { dispose(): void }>(x: T) => T

export function addWings(
  group: THREE.Group,
  keep: Keep,
  at: { x: number; floor: number; houseW: number; houseD: number; wingEnd: number },
  mats: { white: THREE.Material; trim: THREE.Material; glass: THREE.Material; rail: THREE.Material },
  { detail }: { detail: boolean },
) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const { x, floor, houseW, wingEnd } = at
  const wingD = at.houseD - 2.4
  const deck = floor + 0.3

  for (const s of [1, -1]) {
    const z0 = houseW / 2
    const len = wingEnd - z0
    const mid = s * (z0 + len / 2)
    add(new THREE.BoxGeometry(wingD, 0.3, len), mats.white, x, floor + 0.15, mid)
    for (const dx of [-wingD / 2, wingD / 2]) {
      add(new THREE.BoxGeometry(0.16, 1.1, len), mats.white, x + dx, deck + 0.55, mid)
      add(new THREE.BoxGeometry(0.3, 0.07, len), mats.rail, x + dx, deck + 1.13, mid)
    }

    // conning console against the forward bulwark, a gyro repeater outboard of it
    add(new THREE.BoxGeometry(0.75, 1.05, 1.7), mats.white, x + wingD / 2 - 0.55, deck + 0.52, s * (z0 + 1.4))
    add(new THREE.BoxGeometry(0.7, 0.06, 1.6), mats.trim, x + wingD / 2 - 0.6, deck + 1.07, s * (z0 + 1.4))
    if (detail) {
      add(new THREE.CylinderGeometry(0.12, 0.16, 1.05, 8), mats.trim, x + wingD / 2 - 0.7, deck + 0.52, s * (z0 + 3.1))
      add(new THREE.CylinderGeometry(0.32, 0.28, 0.2, 16), mats.white, x + wingD / 2 - 0.7, deck + 1.12, s * (z0 + 3.1))
    }

    // the wing cab: bulkhead, glass, raked front pane, fascia, a roof with a visor
    const cx = x + 0.6
    const cz = s * (wingEnd - 1.35)
    const d = 3.4
    const w = 2.7
    add(new THREE.BoxGeometry(d, 1, w), mats.white, cx, deck + 0.5, cz)
    add(new THREE.BoxGeometry(d - 0.2, 1.15, w - 0.2), mats.glass, cx, deck + 1.575, cz)
    const pane = add(new THREE.BoxGeometry(0.08, 1.2, w - 0.1), mats.glass, cx + d / 2 + 0.17, deck + 1.575, cz)
    pane.rotation.z = -0.3
    add(new THREE.BoxGeometry(d + 0.4, 0.45, w), mats.white, cx + 0.2, deck + 2.375, cz)
    add(new THREE.BoxGeometry(d + 1.2, 0.18, w + 0.6), mats.white, cx + 0.35, deck + 2.69, cz)
    const visor = add(new THREE.BoxGeometry(0.7, 0.06, w + 0.6), mats.white, cx + d / 2 + 1.15, deck + 2.55, cz)
    visor.rotation.z = -0.25
    // sidelight housing on the outboard end, the lamp itself is in deckhouse.ts
    add(new THREE.BoxGeometry(1.1, 0.75, 0.35), mats.trim, cx - 0.2, deck + 1.9, s * (wingEnd - 0.1))
  }
}
