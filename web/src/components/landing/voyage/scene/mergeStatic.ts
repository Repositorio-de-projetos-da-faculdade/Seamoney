import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The ship is built from hundreds of small parts (railings, rungs, bollards, braces, lamps). Drawn one by one they
// cost a draw call each, three times a frame (scene, reflection, shadows). Nothing in them moves relative to the ship,
// so the plain single-material meshes are merged into one mesh per material and shadow setting.

/**
 * Merges the static meshes under `group`, leaving out anything in `keepApart` (moving parts). The parts' own
 * geometries stay with their owner's disposables; the merged ones go through `keep`.
 */
export function mergeStatic(group: THREE.Group, keepApart: Set<THREE.Object3D>, keep: <T extends { dispose(): void }>(x: T) => T) {
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>()
  group.updateMatrixWorld(true)
  const inverse = group.matrixWorld.clone().invert()

  group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || keepApart.has(mesh) || Array.isArray(mesh.material)) return
    if (mesh.parent && keepApart.has(mesh.parent)) return
    const geometry = mesh.geometry
    const attributes = Object.keys(geometry.attributes).sort().join(',')
    const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${attributes}|${geometry.index ? 'i' : 'n'}`
    let bucket = buckets.get(key)
    if (!bucket) buckets.set(key, (bucket = { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [], meshes: [] }))
    // into the group's own space, so the merged mesh sits where the parts were
    bucket.parts.push(geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)))
    bucket.meshes.push(mesh)
  })

  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue
    const merged = mergeGeometries(bucket.parts)
    bucket.parts.forEach((g) => g.dispose())
    if (!merged) continue
    bucket.meshes.forEach((m) => m.removeFromParent())
    const mesh = new THREE.Mesh(keep(merged), bucket.material)
    mesh.castShadow = bucket.cast
    mesh.receiveShadow = bucket.receive
    group.add(mesh)
  }
}
