import * as THREE from 'three'
import { deckAt } from '../hull'
import { BREAKWATER, inboard } from './layout'

// The breakwater that shields the forward stacks from green water: a shallow V of plate across the forecastle,
// lower towards the sides, open at both ends for the walkways, with a flanged top and triangular brackets on its aft
// face. The same brackets stiffen the forecastle bulwark (fittings.ts).

type Keep = <T extends { dispose(): void }>(x: T) => T

/** A triangular bracket plate standing on the deck, its long leg against a wall: `h` high, `w` deep, thin in z. */
export function bracketGeometry(h: number, w: number, thickness = 0.07) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(w, 0)
  shape.lineTo(0, h)
  shape.lineTo(0, 0)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  geometry.translate(0, 0, -thickness / 2)
  return geometry
}

export function addBreakwater(group: THREE.Group, keep: Keep, mats: { plate: THREE.Material; edge: THREE.Material }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: THREE.Vector3, yaw: number) => {
    const mesh = new THREE.Mesh(keep(geo), mat)
    mesh.position.copy(at)
    mesh.rotation.y = yaw
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  for (const s of [1, -1]) {
    // the wall's plan, from its foot by the bulwark to the apex, bowed slightly forward
    const foot = new THREE.Vector2(BREAKWATER.feet, s * (inboard(BREAKWATER.feet) - 1.5))
    const apex = new THREE.Vector2(BREAKWATER.apex, 0)
    const steps = 6
    const plan = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps
      const p = foot.clone().lerp(apex, t)
      p.x += Math.sin(t * Math.PI) * BREAKWATER.reach
      return p
    })
    for (let i = 0; i < steps; i++) {
      const a = plan[i]
      const b = plan[i + 1]
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const len = a.distanceTo(b) + 0.12
      // lower towards the sides
      const h = BREAKWATER.height * (0.82 + 0.18 * ((i + 0.5) / steps))
      const deck = deckAt(mid.x)
      // a box's length (local x) maps to (cos yaw, 0, -sin yaw): yaw it along the wall, a to b
      const yaw = (v: THREE.Vector2) => Math.atan2(-v.y, v.x)
      const along = b.clone().sub(a).normalize()
      // the wall's aft normal in plan
      const aft = new THREE.Vector2(along.y, -along.x)
      if (aft.x > 0) aft.negate()
      add(new THREE.BoxGeometry(len, h, 0.22), mats.plate, new THREE.Vector3(mid.x, deck + h / 2, mid.y), yaw(along))
      add(new THREE.BoxGeometry(len, 0.1, 0.62), mats.edge, new THREE.Vector3(mid.x + aft.x * 0.2, deck + h, mid.y + aft.y * 0.2), yaw(along))
      // brackets on the aft face, at right angles to the wall, two per segment
      for (const t of [0.25, 0.75]) {
        const p = a.clone().lerp(b, t).addScaledVector(aft, 0.11)
        add(bracketGeometry(h * 0.9, 1.5), mats.plate, new THREE.Vector3(p.x, deckAt(p.x), p.y), yaw(aft))
      }
    }
  }
}
