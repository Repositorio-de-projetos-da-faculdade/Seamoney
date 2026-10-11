import * as THREE from 'three'
import { createDeckhouse } from './deckhouse'
import { addDeckGear } from './detail/deckGear'
import { addFunnelDetail } from './detail/funnel'
import { addNightLights } from './detail/nightLights'
import { hullPlating } from './detail/plating'
import { addSuperstructureDetail } from './detail/superstructure'
import { createForecastle } from './forecastle'
import { FORECASTLE } from './forecastle/layout'
import { deckGeometry, hullGeometry, transomGeometry } from './hull'
import { hullLivery } from './livery'
import { mergeStatic } from './mergeStatic'
import { doorTexture, roofTexture, sideTextures } from './steel'
import { BAYS, BOX40, FORWARD_BAYS, MEMO_ROWS, rowZ, tierY, type Bay } from './stowage'

// The container ship: hull, deck gear, the stacks of ordinary cargo and the superstructure. The memo tier on top
// of the forward bays is built separately (cargo.ts) because it changes with the invoice number.

// muted, weathered shipping colours, so the lit memo tier reads first
const CARGO_COLORS = ['#7c3428', '#2f5d80', '#9a7a2c', '#35684e', '#5b6770', '#a9b2b7', '#20384f', '#1f6b67', '#6a2934', '#8f4a26', '#3e4a5c', '#47523a']

function rand(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const memoBays = new Set(FORWARD_BAYS.slice(0, 4))

/** 'low' for phones, 'high' for a live desktop page, 'offline' for the pre-rendered frames (every lamp is a real light). */
export type ShipQuality = 'low' | 'high' | 'offline'

export function createShip(quality: ShipQuality) {
  const group = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)
  const shadowed = <T extends THREE.Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)

  // hull: lofted shell with the painted livery and a wet-looking clearcoat
  const hullMat = keep(
    new THREE.MeshPhysicalMaterial({ map: keep(hullLivery()), roughness: 0.5, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
  )
  if (quality !== 'low') {
    hullMat.normalMap = keep(hullPlating(quality === 'offline' ? 4096 : 2048))
    hullMat.normalScale.set(1.2, 1.2)
  }
  group.add(shadowed(new THREE.Mesh(keep(hullGeometry()), hullMat)))
  group.add(shadowed(new THREE.Mesh(keep(transomGeometry()), hullMat)))
  const deckMat = keep(new THREE.MeshStandardMaterial({ color: '#27322f', roughness: 0.92, metalness: 0.15 }))
  // the forecastle has its own painted deck (forecastle/)
  group.add(shadowed(new THREE.Mesh(keep(deckGeometry(0.25, undefined, FORECASTLE.paint)), deckMat)))

  const steel = keep(new THREE.MeshStandardMaterial({ color: '#34444c', roughness: 0.75, metalness: 0.45 }))

  // hatch covers under every bay
  for (const b of BAYS) {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(BOX40.l + 0.6, 1.1, b.half * 2 * 2.5 + 0.4)), steel)
    m.position.set(b.x, b.base - 0.55, 0)
    group.add(shadowed(m))
  }

  // ordinary cargo, instanced: one 40 ft box per slot
  const side = sideTextures()
  const sideMat = keep(
    new THREE.MeshStandardMaterial({ map: keep(side.map), normalMap: keep(side.normalMap), normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.7, metalness: 0.3 }),
  )
  const doorMat = keep(new THREE.MeshStandardMaterial({ map: keep(doorTexture()), roughness: 0.75, metalness: 0.3 }))
  const roofMat = keep(new THREE.MeshStandardMaterial({ map: keep(roofTexture()), roughness: 0.8, metalness: 0.2 }))
  const bottomMat = keep(new THREE.MeshStandardMaterial({ color: '#111111', roughness: 1 }))
  const slots: THREE.Vector3[] = []
  const put = (b: Bay, r: number, s: 1 | -1, t: number) => slots.push(new THREE.Vector3(b.x, tierY(b, t), rowZ(r, s)))
  for (const b of BAYS) {
    for (let r = 0; r < b.half; r++) {
      for (const s of [1, -1] as const) {
        for (let t = 0; t < b.tiers[r]; t++) put(b, r, s, t)
        // memo bays: outer rows get one more tier, level with the memo boxes in the middle
        if (memoBays.has(b) && r >= MEMO_ROWS && b.tiers[r] === b.tiers[0]) put(b, r, s, b.tiers[r])
      }
    }
  }
  const cargo = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(BOX40.l, BOX40.h, BOX40.w)), [doorMat, doorMat, roofMat, bottomMat, sideMat, sideMat], slots.length)
  const rnd = rand(42)
  const m = new THREE.Matrix4()
  const color = new THREE.Color()
  slots.forEach((p, i) => {
    cargo.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z))
    cargo.setColorAt(i, color.set(CARGO_COLORS[Math.floor(rnd() * CARGO_COLORS.length)]).multiplyScalar(1 + rnd() * 0.35))
  })
  group.add(shadowed(cargo))

  // lashing bridges between the bays, and the crossed lashing rods from the bridges to the lower tiers
  const rods: number[] = []
  for (const b of BAYS) {
    const width = b.half * 2 * 2.5
    for (const end of [-1, 1]) {
      const x = b.x + end * (BOX40.l / 2 + 0.5)
      for (const level of [2.6, 5.25]) {
        const plate = new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.14, width)), steel)
        plate.position.set(x, b.base + level, 0)
        group.add(shadowed(plate))
      }
      if (quality === 'low') continue
      const xc = b.x + end * (BOX40.l / 2 - 0.05)
      for (let r = 0; r < b.half; r++) {
        for (const s of [1, -1] as const) {
          const z = rowZ(r, s)
          rods.push(x, b.base + 5.25, z - 1.1, xc, b.base + 0.25, z + 1.1)
          rods.push(x, b.base + 5.25, z + 1.1, xc, b.base + 0.25, z - 1.1)
          rods.push(x, b.base + 2.6, z - 1.1, xc, b.base + 2.85, z + 1.1)
        }
      }
    }
  }
  if (rods.length) {
    const g = keep(new THREE.BufferGeometry())
    g.setAttribute('position', new THREE.Float32BufferAttribute(rods, 3))
    group.add(new THREE.LineSegments(g, keep(new THREE.LineBasicMaterial({ color: '#4f5d66', transparent: true, opacity: 0.4 }))))
  }

  // deck gear, railings, walkways, the funnel top and the walkway lamps (detail/)
  const rails = quality !== 'low'
  const rail = keep(new THREE.MeshStandardMaterial({ color: '#aebdc4', roughness: 0.55, metalness: 0.5 }))
  const deckhouse = createDeckhouse(group, keep, rail, { detail: rails })
  const drum = keep(new THREE.MeshStandardMaterial({ color: '#4a5a52', roughness: 0.6, metalness: 0.4 }))
  addDeckGear(group, keep, { rail, steel, hull: hullMat, drum }, { rails })
  const white = keep(new THREE.MeshStandardMaterial({ color: '#cfd9de', roughness: 0.6, metalness: 0.1 }))
  const boat = keep(new THREE.MeshStandardMaterial({ color: '#f26b1d', roughness: 0.45 }))
  addSuperstructureDetail(group, keep, { rail, steel, white, boat }, { rails })
  const soot = keep(new THREE.MeshStandardMaterial({ color: '#0b0d0f', roughness: 0.9 }))
  addFunnelDetail(group, keep, deckhouse.funnel, { rail, steel, soot }, { rails })
  createForecastle(group, keep, { rail, white }, { detail: rails })
  addNightLights(group, keep, { lit: quality === 'offline' })

  mergeStatic(group, new Set(deckhouse.moving), keep)

  return {
    group,
    update(time: number) {
      deckhouse.update(time)
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
