import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Ship's railings: stanchions at a regular pitch along a path, a top rail and a knee rail. Used along the deck edge,
// around every storey of the accommodation and on the platforms. Left out on phones (see ship.ts).

type Keep = <T extends { dispose(): void }>(x: T) => T

const STANCHION = new THREE.CylinderGeometry(0.035, 0.035, 1, 5)
STANCHION.translate(0, 0.5, 0)

/** Points every `step` metres along a polyline, with the tangent at each. */
function along(path: THREE.Vector3[], step: number) {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const n = Math.max(1, Math.round(a.distanceTo(b) / step))
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n))
  }
  out.push(path[path.length - 1].clone())
  return out
}

/**
 * A railing standing on `path` (its points are the deck under the railing). Returns the meshes added to `group`.
 * `closed` joins the last point back to the first (a rail around a platform).
 */
export function railing(group: THREE.Group, keep: Keep, material: THREE.Material, path: THREE.Vector3[], { height = 1.1, pitch = 1.6, closed = false } = {}) {
  const points = closed ? [...path, path[0]] : path
  // the stanchions as one plain mesh (not instanced), so mergeStatic can fold every railing into a single draw
  const m = new THREE.Matrix4()
  const posts = along(points, pitch).map((p) => STANCHION.clone().applyMatrix4(m.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, height, 1))))
  const stanchions = new THREE.Mesh(keep(mergeGeometries(posts)), material)
  posts.forEach((g) => g.dispose())
  stanchions.castShadow = true
  group.add(stanchions)

  for (const level of [height, height * 0.5]) {
    const curve = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < points.length - 1; i++) {
      curve.add(new THREE.LineCurve3(points[i].clone().setY(points[i].y + level), points[i + 1].clone().setY(points[i + 1].y + level)))
    }
    const tube = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), level === height ? 0.045 : 0.03, 5, false)), material)
    tube.castShadow = true
    group.add(tube)
  }
}

/** The corners of a rectangle at height y, inset from its edges, for a railing around a platform. */
export const rect = (x0: number, x1: number, z0: number, z1: number, y: number) => [
  new THREE.Vector3(x0, y, z0),
  new THREE.Vector3(x1, y, z0),
  new THREE.Vector3(x1, y, z1),
  new THREE.Vector3(x0, y, z1),
]
