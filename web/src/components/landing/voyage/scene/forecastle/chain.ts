import * as THREE from 'three'

// An anchor cable as real links: one instanced torus, stretched into a stud-link shape, laid every half link along
// a polyline with every other link turned a quarter round the cable, the way chain lies. One draw call per cable.

type Keep = <T extends { dispose(): void }>(x: T) => T

const LINK = 0.62

export function chainCable(keep: Keep, material: THREE.Material, path: [number, number, number][]) {
  const points = path.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]))
  const total = lengths.reduce((a, b) => a + b, 0)
  const count = Math.floor(total / (LINK * 0.72))

  const geometry = keep(new THREE.TorusGeometry(0.2, 0.065, 6, 14))
  // the link lies along x, its opening in the xy plane
  geometry.scale(LINK / 0.53, 1, 1)
  const links = new THREE.InstancedMesh(geometry, material, count)
  links.castShadow = links.receiveShadow = true

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const twist = new THREE.Quaternion()
  const xAxis = new THREE.Vector3(1, 0, 0)
  const at = new THREE.Vector3()
  const dir = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    let d = (i + 0.5) * (total / count)
    let k = 0
    while (k < lengths.length - 1 && d > lengths[k]) d -= lengths[k++]
    at.lerpVectors(points[k], points[k + 1], Math.min(1, d / lengths[k]))
    dir.subVectors(points[k + 1], points[k]).normalize()
    q.setFromUnitVectors(xAxis, dir)
    twist.setFromAxisAngle(xAxis, i % 2 ? Math.PI / 2 : 0)
    links.setMatrixAt(i, m.compose(at, q.clone().multiply(twist), new THREE.Vector3(1, 1, 1)))
  }
  return links
}
