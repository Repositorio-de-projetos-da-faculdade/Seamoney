import * as THREE from 'three'
import { MEMO_SIZE, type MemoByte } from '@/lib/memo'
import { drawLabel, labelCanvas, memoColor } from './memoLabel'
import { doorTexture, sideTextures } from './steel'
import { BOX20, MEMO_SLOTS } from './stowage'

// The memo tier: 32 boxes of 20 ft on top of the forward bays, one per byte, read like text from above. They are
// lowered by crane as the visitor scrolls (setLoad), and lowered again one by one when the visitor types a new
// invoice number (setBytes). Bytes of the reference are mint and lit; the zero padding is plain steel.

const DROP = 38
const REDROP_SECONDS = 0.75

const ease = (t: number) => 1 - (1 - t) ** 3

interface Slot {
  box: THREE.Mesh
  spreader: THREE.Group
  side: THREE.MeshStandardMaterial
  top: THREE.MeshStandardMaterial
  label: ReturnType<typeof labelCanvas>
  home: THREE.Vector3
  hex: string
  redropAt: number
}

export function createCargo(initial: MemoByte[]) {
  const group = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)

  const boxGeo = keep(new THREE.BoxGeometry(BOX20.l, BOX20.h, BOX20.w))
  const steel = sideTextures()
  keep(steel.map)
  keep(steel.normalMap)
  const doorMat = keep(new THREE.MeshStandardMaterial({ map: keep(doorTexture()), roughness: 0.6, metalness: 0.3 }))
  const bottom = keep(new THREE.MeshStandardMaterial({ color: '#0a1620' }))

  // the crane spreader that holds a box while it is lowered, and its wire
  const yellow = keep(new THREE.MeshStandardMaterial({ color: '#e8b21c', roughness: 0.5, metalness: 0.4, emissive: '#e8b21c', emissiveIntensity: 0.12 }))
  const frameGeo = keep(new THREE.BoxGeometry(BOX20.l - 0.2, 0.45, BOX20.w - 0.1))
  const wireGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, 1, 5))
  wireGeo.translate(0, 0.5, 0)
  const wireMat = keep(new THREE.MeshBasicMaterial({ color: '#9fb6c4', transparent: true, opacity: 0.28 }))

  let load = 0
  let clock = 0

  const slots: Slot[] = MEMO_SLOTS.map((p) => {
    const label = labelCanvas()
    keep(label.texture)
    const side = keep(new THREE.MeshStandardMaterial({ map: steel.map, normalMap: steel.normalMap, roughness: 0.55, metalness: 0.3 }))
    const top = keep(new THREE.MeshStandardMaterial({ map: label.texture, emissive: '#ffffff', emissiveMap: label.texture, roughness: 0.5 }))
    const box = new THREE.Mesh(boxGeo, [doorMat, doorMat, top, bottom, side, side])
    box.castShadow = true
    box.receiveShadow = true
    const spreader = new THREE.Group()
    const frame = new THREE.Mesh(frameGeo, yellow)
    frame.position.y = BOX20.h / 2 + 0.25
    const wire = new THREE.Mesh(wireGeo, wireMat)
    wire.position.y = BOX20.h / 2 + 0.45
    wire.scale.y = 16
    spreader.add(frame, wire)
    group.add(box, spreader)
    return { box, spreader, side, top, label, home: new THREE.Vector3(p.x, p.y, p.z), hex: '', redropAt: -10 }
  })

  function paint(slot: Slot, byte: MemoByte, i: number) {
    drawLabel(slot.label.g, byte, i)
    slot.label.texture.needsUpdate = true
    const c = memoColor(byte, i)
    slot.side.color.set(c)
    slot.side.emissive.set(c).multiplyScalar(byte.padding ? 0 : 0.05)
    slot.top.emissiveIntensity = byte.padding ? 0.1 : 0.2
    slot.hex = byte.hex
  }
  initial.forEach((b, i) => paint(slots[i], b, i))

  function place() {
    slots.forEach((slot, i) => {
      // scroll-driven: each box gets its own window of the load progress, in reading order
      const start = (i / MEMO_SIZE) * 0.78
      const scrolled = THREE.MathUtils.clamp((load - start) / 0.22, 0, 1)
      // time-driven: lowered again after the visitor changes its byte
      const typed = THREE.MathUtils.clamp((clock - slot.redropAt) / REDROP_SECONDS, 0, 1)
      const t = ease(Math.min(scrolled, typed))
      const swing = (1 - t) * Math.sin(clock * 1.6 + i) * 0.05
      slot.box.visible = scrolled > 0
      slot.box.position.set(slot.home.x, slot.home.y + (1 - t) * DROP, slot.home.z)
      slot.box.rotation.set(swing, (1 - t) * 0.18 * Math.sin(i * 1.7), swing)
      // the spreader lets go once the box has landed
      slot.spreader.visible = slot.box.visible && t < 0.999
      slot.spreader.position.copy(slot.box.position)
      slot.spreader.rotation.copy(slot.box.rotation)
    })
  }
  place()

  return {
    group,
    setLoad(p: number) {
      load = p
      place()
    },
    setBytes(bytes: MemoByte[]) {
      bytes.forEach((b, i) => {
        const slot = slots[i]
        if (slot.hex === b.hex) return
        paint(slot, b, i)
        slot.redropAt = clock + i * 0.025
      })
      place()
    },
    update(time: number) {
      clock = time
      place()
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
