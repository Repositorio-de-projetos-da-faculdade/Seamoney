import * as THREE from 'three'
import { MARK } from '@/lib/brand-paths'
import { deckAt } from '../hull'
import { FUNNEL_X } from '../stowage'

// The funnel and the engine casing under it. The funnel is lofted from rounded-rectangle sections that narrow and
// rake aft as they rise, and wears the livery all the way round: navy, a mint band, the brand mark on both sides
// and a black top. The casing steps up in two levels with louvres and doors, in dark steel so it reads as one piece
// with the funnel rather than as boxes on the deck.

type Keep = <T extends { dispose(): void }>(x: T) => T

const HEIGHT = 16
const SEGMENTS = 64
const ROWS = 12
/** Half length (x) and half width (z) of the section at the foot and at the top, and how far the top rakes aft. */
const FOOT = { a: 5.6, b: 4.3 }
const TOP = { a: 4.4, b: 3.4 }
const RAKE = 2.4

/** A rounded rectangle (superellipse) point at angle t, going clockwise seen from above so the livery reads. */
function section(t: number, a: number, b: number) {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const k = 2 / 4
  return [a * Math.sign(c) * Math.abs(c) ** k, -b * Math.sign(s) * Math.abs(s) ** k]
}

function funnelGeometry() {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= ROWS; j++) {
    const v = j / ROWS
    const a = FOOT.a + (TOP.a - FOOT.a) * v
    const b = FOOT.b + (TOP.b - FOOT.b) * v
    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS
      const [x, z] = section(u * Math.PI * 2, a, b)
      positions.push(x - RAKE * v, v * HEIGHT, z)
      uvs.push(u, v)
    }
  }
  const ring = SEGMENTS + 1
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      const p = j * ring + i
      indices.push(p, p + 1, p + ring, p + 1, p + ring + 1, p + ring)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/** The livery wrapped round the funnel: u runs round it, the mark sits midway down each side. */
function funnelWrap() {
  const W = 2048
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#0a2643'
  g.fillRect(0, 0, W, H)
  // soot-black top, a thin mint band under it
  g.fillStyle = '#0b0e11'
  g.fillRect(0, 0, W, 104)
  g.fillStyle = '#24e4b4'
  g.fillRect(0, 150, W, 30)
  const scale = 380 / MARK.height
  for (const u of [0.25, 0.75]) {
    g.save()
    g.translate(u * W - (MARK.width * scale) / 2, 290)
    g.scale(scale, scale)
    g.fillStyle = '#24e4b4'
    g.fill(new Path2D(MARK.green), 'evenodd')
    g.fillStyle = '#eef5f8'
    g.fill(new Path2D(MARK.white), 'evenodd')
    g.restore()
  }
  // weathering: soot drifting down from the top, a few rust runs
  const soot = g.createLinearGradient(0, 100, 0, 360)
  soot.addColorStop(0, 'rgba(5,6,8,0.55)')
  soot.addColorStop(1, 'rgba(5,6,8,0)')
  g.fillStyle = soot
  g.fillRect(0, 100, W, 260)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

/** Louvred vent panel for the casing sides. */
function louvreTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#26353e'
  g.fillRect(0, 0, 256, 256)
  for (let y = 12; y < 244; y += 14) {
    g.fillStyle = '#1b2328'
    g.fillRect(14, y, 228, 7)
    g.fillStyle = '#56666f'
    g.fillRect(14, y + 7, 228, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createFunnel(group: THREE.Group, keep: Keep, mats: { steel: THREE.Material; soot: THREE.Material }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const deck = deckAt(FUNNEL_X)
  const casing = keep(new THREE.MeshStandardMaterial({ color: '#26353e', roughness: 0.6, metalness: 0.35 }))
  const louvre = keep(new THREE.MeshStandardMaterial({ map: keep(louvreTexture()), roughness: 0.8, metalness: 0.3 }))

  // engine casing: a wide lower level and a narrower upper one, louvres on the sides
  add(new THREE.BoxGeometry(18, 3.4, 21), casing, FUNNEL_X + 2, deck + 1.7, 0)
  add(new THREE.BoxGeometry(13, 3, 14), casing, FUNNEL_X + 0.5, deck + 4.9, 0)
  for (const s of [1, -1]) {
    add(new THREE.PlaneGeometry(9, 2.4), louvre, FUNNEL_X + 1, deck + 1.8, s * 10.52).rotation.y = s > 0 ? 0 : Math.PI
    add(new THREE.PlaneGeometry(6, 2), louvre, FUNNEL_X + 0.5, deck + 5, s * 7.02).rotation.y = s > 0 ? 0 : Math.PI
    // a door at deck level on each side
    add(new THREE.BoxGeometry(1, 2.1, 0.08), mats.steel, FUNNEL_X + 8, deck + 1.05, s * 10.52)
  }

  // the funnel on top
  const base = deck + 6.4
  const funnel = add(funnelGeometry(), keep(new THREE.MeshStandardMaterial({ map: keep(funnelWrap()), roughness: 0.45, metalness: 0.25 })), FUNNEL_X - 0.5, base, 0)
  funnel.castShadow = true
  // the open top, a little below the rim
  const cap = new THREE.Shape()
  for (let i = 0; i <= SEGMENTS; i++) {
    const [x, z] = section((i / SEGMENTS) * Math.PI * 2, TOP.a - 0.15, TOP.b - 0.15)
    if (i === 0) cap.moveTo(x, -z)
    else cap.lineTo(x, -z)
  }
  const capMesh = add(new THREE.ShapeGeometry(cap), mats.soot, FUNNEL_X - 0.5 - RAKE, base + HEIGHT - 0.3, 0)
  capMesh.rotation.x = -Math.PI / 2

  return { top: base + HEIGHT, cx: FUNNEL_X - 0.5 - RAKE }
}
