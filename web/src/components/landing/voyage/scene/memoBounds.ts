import * as THREE from 'three'
import { BOX20, MEMO_SLOTS } from './stowage'

// The memo tier's roof as four corners on deck, so the page can frame the 32 containers on screen while the camera
// moves (the HUD brackets in MemoFrame.tsx).

const xs = MEMO_SLOTS.map((s) => s.x)
const zs = MEMO_SLOTS.map((s) => s.z)
const top = Math.max(...MEMO_SLOTS.map((s) => s.y)) + BOX20.h / 2
const x0 = Math.min(...xs) - BOX20.l / 2
const x1 = Math.max(...xs) + BOX20.l / 2
const z0 = Math.min(...zs) - BOX20.w / 2
const z1 = Math.max(...zs) + BOX20.w / 2
const CORNERS = [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
].map(([x, z]) => new THREE.Vector3(x, top, z))

export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}

const v = new THREE.Vector3()

/** The memo tier's bounding box on screen, in CSS pixels of a canvas of the given size. */
export function projectMemo(vessel: THREE.Object3D, camera: THREE.Camera, width: number, height: number): ScreenRect {
  vessel.updateMatrixWorld()
  camera.updateMatrixWorld()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const corner of CORNERS) {
    v.copy(corner)
    vessel.localToWorld(v)
    v.project(camera)
    const x = ((v.x + 1) / 2) * width
    const y = ((1 - v.y) / 2) * height
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
