import * as THREE from 'three'
import { railing, rect } from '../detail/rail'
import { deckAt, halfBreadth, HULL } from '../hull'
import { bracketGeometry } from './breakwater'
import { AIR_PIPES, BITTS, CHOCKS, FOREMAST, FORECASTLE, HATCHES, inboard, VENTS } from './layout'

// The smaller fittings that make a forecastle read as working steel: the capping rail and brackets of the bulwark,
// Panama chocks in it and double bitts inside it, the foremast on its store house with a lamp platform, crosstree,
// bell and ladder, the forepeak hatch, mushroom vents, goose-neck air pipes, and the anchors housed in their pockets
// on the shell. Small parts are left out on phones (`detail`).

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface FittingMaterials {
  paint: THREE.Material
  dark: THREE.Material
  bright: THREE.Material
  white: THREE.Material
  rail: THREE.Material
}

const UP = new THREE.Vector3(0, 1, 0)

/** Top of the bulwark (deckGear.ts) at x on one side. */
const bulwarkTop = (x: number, s: number) => new THREE.Vector3(x, deckAt(x) + 1.9, s * (Math.max(halfBreadth(x, 1), 0.02) * 1.015 + 0.15))

export function addFittings(group: THREE.Group, keep: Keep, mats: FittingMaterials, { detail }: { detail: boolean }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(keep(geo), mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  /** Yaw that turns local x along the bulwark at x on side s. */
  const bulwarkYaw = (x: number, s: number) => {
    const a = bulwarkTop(x - 0.5, s)
    const b = bulwarkTop(x + 0.5, s)
    return Math.atan2(-(b.z - a.z), b.x - a.x)
  }

  for (const s of [1, -1] as const) {
    // capping rail along the bulwark top, segment by segment to the stem
    for (let x = FORECASTLE.x0; x < FORECASTLE.stem - 1; x += 1.5) {
      const a = bulwarkTop(x, s)
      // the last segment closes on the stem, where the two sides meet
      const b = x + 1.5 >= FORECASTLE.stem - 1 ? new THREE.Vector3(FORECASTLE.stem - 0.9, deckAt(FORECASTLE.stem) + 1.9, 0) : bulwarkTop(x + 1.5, s)
      const cap = add(new THREE.BoxGeometry(a.distanceTo(b) + 0.05, 0.12, 0.38), mats.rail, (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.06, (a.z + b.z) / 2)
      cap.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x)
    }
    // brackets inside the bulwark
    if (detail) {
      for (let x = FORECASTLE.x0 + 0.8; x < 92; x += 1.6) {
        const bracket = add(bracketGeometry(1.7, 0.55, 0.05), mats.paint, x, deckAt(x), s * (halfBreadth(x, 1) - 0.05))
        bracket.rotation.y = bulwarkYaw(x, s) + (s * Math.PI) / 2
      }
    }

    // Panama chocks set into the bulwark top: a heavy frame round a dark oval opening
    for (const x of CHOCKS) {
      const top = bulwarkTop(x, s)
      const yaw = bulwarkYaw(x, s)
      add(new THREE.BoxGeometry(1.4, 1, 0.6), mats.paint, top.x, top.y - 0.25, top.z).rotation.y = yaw
      add(new THREE.BoxGeometry(0.8, 0.45, 0.62), mats.dark, top.x, top.y - 0.25, top.z).rotation.y = yaw
    }

    // double bitts on a base plate, a little inboard of the bulwark
    for (const x of BITTS) {
      const z = s * (inboard(x) - 1.3)
      const deck = deckAt(x)
      const base = add(new THREE.BoxGeometry(2.3, 0.14, 0.85), mats.paint, x, deck + 0.07, z)
      base.rotation.y = bulwarkYaw(x, s)
      for (const dx of [-0.62, 0.62]) {
        const along = new THREE.Vector3(dx, 0, 0).applyAxisAngle(UP, base.rotation.y)
        add(new THREE.CylinderGeometry(0.3, 0.33, 0.95, 16), mats.paint, x + along.x, deck + 0.6, z + along.z)
        add(new THREE.CylinderGeometry(0.4, 0.4, 0.09, 16), mats.paint, x + along.x, deck + 1.1, z + along.z)
      }
    }

    // goose-neck air pipes along the bulwark: a riser and a bend turned down, so spray cannot get in
    for (const x of AIR_PIPES) {
      const z = s * (inboard(x) - 0.75)
      const deck = deckAt(x)
      add(new THREE.CylinderGeometry(0.14, 0.16, 1.1, 10), mats.paint, x, deck + 0.55, z)
      add(new THREE.TorusGeometry(0.24, 0.14, 8, 10, Math.PI), mats.paint, x + 0.24, deck + 1.1, z)
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), mats.dark, x + 0.48, deck + 0.95, z)
    }

    // the anchor housed in its pocket on the shell, below the deck hawse
    addAnchor(add, mats, s)
  }

  // the centre lead at the stem
  add(new THREE.BoxGeometry(1.6, 1.1, 1.8), mats.paint, FORECASTLE.stem - 1.3, deckAt(94.7) + 1.55, 0)
  add(new THREE.BoxGeometry(1.62, 0.5, 1), mats.dark, FORECASTLE.stem - 1.3, deckAt(94.7) + 1.55, 0)

  // foremast on its store house: a tapered pole, a lamp platform, the crosstree, the bell and a ladder up the back
  const deck = deckAt(FOREMAST.x)
  const roof = deck + 2.6
  add(new THREE.BoxGeometry(3.4, 2.6, 3.2), mats.white, FOREMAST.x, deck + 1.3, 0)
  add(new THREE.BoxGeometry(3.6, 0.14, 3.4), mats.paint, FOREMAST.x, roof + 0.07, 0)
  add(new THREE.BoxGeometry(0.06, 1.9, 0.9), mats.dark, FOREMAST.x - 1.71, deck + 1.05, 0.6)
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), mats.paint, FOREMAST.x + 0.9, roof + 0.4, -0.9)
  const pole = FOREMAST.height - 2.6
  add(new THREE.CylinderGeometry(0.17, 0.3, pole, 12), mats.white, FOREMAST.x, roof + pole / 2, 0)
  const platform = deck + FOREMAST.platform
  add(new THREE.BoxGeometry(1.9, 0.1, 1.9), mats.paint, FOREMAST.x, platform, 0)
  if (detail) railing(group, keep, mats.rail, rect(FOREMAST.x - 0.9, FOREMAST.x + 0.9, -0.9, 0.9, platform + 0.05), { closed: true, pitch: 0.9, height: 0.9 })
  add(new THREE.BoxGeometry(0.16, 0.16, 3.4), mats.white, FOREMAST.x, deck + FOREMAST.height - 1.6, 0)
  for (const z of [-1.6, 1.6]) add(new THREE.BoxGeometry(0.3, 0.36, 0.3), mats.dark, FOREMAST.x, deck + FOREMAST.height - 1.35, z)
  // floodlight housings under the platform, looking aft over the stacks
  for (const z of [-0.6, 0.6]) add(new THREE.BoxGeometry(0.5, 0.36, 0.42), mats.dark, FOREMAST.x - 0.7, platform - 0.35, z)
  // the ship's bell, forward
  add(new THREE.CylinderGeometry(0.16, 0.28, 0.42, 14), mats.bright, FOREMAST.x + 0.42, roof + 1.5, 0)
  if (detail) {
    for (const z of [-0.22, 0.22]) add(new THREE.BoxGeometry(0.05, platform - roof, 0.05), mats.rail, FOREMAST.x - 0.42, (roof + platform) / 2, z)
    for (let y = roof + 0.3; y < platform; y += 0.32) add(new THREE.BoxGeometry(0.04, 0.04, 0.44), mats.rail, FOREMAST.x - 0.42, y, 0)
  }

  // forepeak hatches: a raised coaming, the lid and its dogs
  for (const [x, z] of HATCHES) {
    const d = deckAt(x)
    add(new THREE.BoxGeometry(1.5, 0.55, 1.5), mats.paint, x, d + 0.27, z)
    add(new THREE.BoxGeometry(1.7, 0.1, 1.7), mats.paint, x, d + 0.6, z)
    if (detail) for (const [dx, dz] of [[0.85, 0], [-0.85, 0], [0, 0.85], [0, -0.85]]) add(new THREE.BoxGeometry(0.16, 0.2, 0.16), mats.dark, x + dx, d + 0.5, z + dz)
  }

  // mushroom vents
  for (const [x, z] of VENTS) {
    const d = deckAt(x)
    add(new THREE.CylinderGeometry(0.22, 0.24, 0.9, 12), mats.paint, x, d + 0.45, z)
    const cap = add(new THREE.SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.paint, x, d + 0.88, z)
    cap.scale.y = 0.55
  }

  return { mast: { x: FOREMAST.x, top: deck + FOREMAST.height + 0.3, flood: platform - 0.35 } }
}

type Add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => THREE.Mesh

/** A stockless anchor in its recessed pocket on the bow flare, the shank running up into the hull hawse. */
function addAnchor(add: Add, mats: FittingMaterials, s: 1 | -1) {
  const x = 88.4
  const deck = deckAt(x)
  // a frame on the shell surface: along the hull, up the flare, and out of it
  const at = (dx: number, y: number) => {
    const fy = (y - HULL.keel) / (deckAt(x + dx) - HULL.keel)
    return new THREE.Vector3(x + dx, y, s * halfBreadth(x + dx, fy))
  }
  const y = deck - 4.2
  const p = at(0, y)
  // tangent reversed on port, so the frame stays right-handed with `out` pointing outboard on both sides
  const tangent = at(0.5, y).sub(at(-0.5, y)).multiplyScalar(s).normalize()
  const out = new THREE.Vector3().crossVectors(tangent, at(0, y + 0.5).sub(at(0, y - 0.5))).normalize()
  const up = new THREE.Vector3().crossVectors(out, tangent)
  const basis = new THREE.Matrix4().makeBasis(tangent, up, out)
  const place = (mesh: THREE.Mesh, local: THREE.Vector3) => {
    mesh.position.copy(p).add(local.applyMatrix4(basis))
    mesh.quaternion.setFromRotationMatrix(basis)
    return mesh
  }
  // pocket, shank, crown and the two flukes
  place(add(new THREE.BoxGeometry(3.4, 4.6, 0.12), mats.dark, 0, 0, 0), new THREE.Vector3(0, 0.6, 0.02))
  place(add(new THREE.BoxGeometry(0.42, 3.4, 0.4), mats.dark, 0, 0, 0), new THREE.Vector3(0, 1.1, 0.3))
  place(add(new THREE.BoxGeometry(1.1, 0.7, 0.55), mats.dark, 0, 0, 0), new THREE.Vector3(0, -0.6, 0.35))
  for (const side of [-1, 1]) {
    const fluke = place(add(new THREE.BoxGeometry(0.75, 1.5, 0.45), mats.dark, 0, 0, 0), new THREE.Vector3(side * 0.62, -0.2, 0.32))
    fluke.rotateZ(-side * 0.3)
  }
  // the hull hawse ring the shank disappears into
  place(add(new THREE.TorusGeometry(0.42, 0.12, 8, 16), mats.paint, 0, 0, 0), new THREE.Vector3(0, 2.8, 0.18))
}
