import * as THREE from 'three'
import { deckAt } from '../hull'
import { ACCOMMODATION, DECKHOUSE } from '../stowage'

// The accommodation block: storeys of cabins under the bridge. Its faces are painted on canvases (a colour map with
// framed windows, some lit, and an emissive map for the lit ones), in an off-white with grey trim so the block does
// not read as one flat white slab; dark corner posts and a darker plinth give it edges.

type Keep = <T extends { dispose(): void }>(x: T) => T

function rand(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const CELL = 64

/** Window grid for one face: colour map and emissive map. */
function cabinFace(cols: number, rows: number, seed: number) {
  const W = CELL * cols
  const H = CELL * rows
  const color = document.createElement('canvas')
  const glow = document.createElement('canvas')
  color.width = glow.width = W
  color.height = glow.height = H
  const c = color.getContext('2d')!
  const e = glow.getContext('2d')!
  c.fillStyle = '#aeb9bf'
  c.fillRect(0, 0, W, H)
  e.fillStyle = '#000'
  e.fillRect(0, 0, W, H)
  const rnd = rand(seed)
  for (let r = 0; r < rows; r++) {
    const y0 = r * CELL
    // deck edge between storeys, and a faint grime line under it
    c.fillStyle = '#8e9aa1'
    c.fillRect(0, y0 + CELL - 5, W, 5)
    c.fillStyle = 'rgba(60,70,76,0.18)'
    c.fillRect(0, y0, W, 8)
    for (let k = 0; k < cols; k++) {
      const lit = rnd() > 0.45
      const warm = rnd() > 0.25
      const x = k * CELL + 17
      const y = y0 + 20
      // frame, then glass: lit warm or cool, or dark with a faint sky reflection
      c.fillStyle = '#56636a'
      c.fillRect(x - 3, y - 3, 36, 30)
      c.fillStyle = lit ? (warm ? '#f2d3a0' : '#dfe8f5') : '#1c2830'
      c.fillRect(x, y, 30, 24)
      if (!lit) {
        c.fillStyle = 'rgba(120,150,170,0.18)'
        c.fillRect(x, y, 30, 8)
      } else {
        // a curtain drawn part way on some windows
        if (rnd() > 0.6) {
          c.fillStyle = 'rgba(120,80,50,0.45)'
          c.fillRect(x, y, 10 + rnd() * 10, 24)
        }
        e.fillStyle = warm ? `rgb(255,${165 + rnd() * 40},${85 + rnd() * 40})` : '#d6e4ff'
        e.fillRect(x, y, 30, 24)
      }
    }
  }
  const map = new THREE.CanvasTexture(color)
  const emissiveMap = new THREE.CanvasTexture(glow)
  map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = emissiveMap.anisotropy = 8
  return { map, emissiveMap }
}

export function createAccommodation(group: THREE.Group, keep: Keep) {
  const { x0, x1 } = DECKHOUSE
  const { storeys, storey, width } = ACCOMMODATION
  const cx = (x0 + x1) / 2
  const depth = x1 - x0
  const base = deckAt(cx)
  const blockH = storeys * storey

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  const face = (t: { map: THREE.Texture; emissiveMap: THREE.Texture }) =>
    keep(new THREE.MeshStandardMaterial({ map: keep(t.map), emissive: '#ffffff', emissiveMap: keep(t.emissiveMap), emissiveIntensity: 1.1, roughness: 0.7 }))
  const wall = keep(new THREE.MeshStandardMaterial({ color: '#a4afb5', roughness: 0.75, metalness: 0.1 }))
  const trim = keep(new THREE.MeshStandardMaterial({ color: '#59656c', roughness: 0.6, metalness: 0.35 }))
  const side = face(cabinFace(5, storeys, 7))
  add(new THREE.BoxGeometry(depth, blockH, width), [face(cabinFace(10, storeys, 3)), face(cabinFace(10, storeys, 5)), wall, wall, side, side], cx, base + blockH / 2, 0)

  // corner posts and a plinth: the edges that make it read as a volume at night
  for (const x of [x0, x1]) for (const z of [-width / 2, width / 2]) add(new THREE.BoxGeometry(0.5, blockH, 0.5), trim, x, base + blockH / 2, z)
  add(new THREE.BoxGeometry(depth + 0.4, 1.2, width + 0.4), trim, cx, base + 0.6, 0)

  return { cx, depth, base, blockH }
}
