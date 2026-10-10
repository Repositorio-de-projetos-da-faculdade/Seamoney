import * as THREE from 'three'
import { deckAt, HULL } from './hull'
import { funnelLivery } from './livery'
import { DECKHOUSE, FUNNEL_X } from './stowage'

// The superstructure: accommodation block with lit cabins, the bridge and its wings, the radar mast, the funnel
// with the brand mark aft, the lifeboat, the foremast and the navigation lights with their halos.

type Keep = <T extends { dispose(): void }>(x: T) => T

function rand(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** Window grid for one face of the accommodation block: colour map and emissive map. */
function cabinFace(cols: number, rows: number, seed: number) {
  const W = 64 * cols
  const H = 64 * rows
  const color = document.createElement('canvas')
  const glow = document.createElement('canvas')
  color.width = glow.width = W
  color.height = glow.height = H
  const c = color.getContext('2d')!
  const e = glow.getContext('2d')!
  c.fillStyle = '#d7e0e5'
  c.fillRect(0, 0, W, H)
  e.fillStyle = '#000'
  e.fillRect(0, 0, W, H)
  const rnd = rand(seed)
  for (let r = 0; r < rows; r++) {
    // deck line between storeys
    c.fillStyle = '#9fb0ba'
    c.fillRect(0, r * 64 + 60, W, 4)
    for (let k = 0; k < cols; k++) {
      const lit = rnd() > 0.38
      const warm = rnd() > 0.25
      const x = k * 64 + 16
      const y = r * 64 + 18
      c.fillStyle = lit ? '#f4d9a8' : '#1f2b33'
      c.fillRect(x, y, 32, 26)
      if (lit) {
        e.fillStyle = warm ? `rgb(255,${170 + rnd() * 40},${90 + rnd() * 40})` : '#dfe9ff'
        e.fillRect(x, y, 32, 26)
      }
    }
  }
  const map = new THREE.CanvasTexture(color)
  const emissiveMap = new THREE.CanvasTexture(glow)
  map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = emissiveMap.anisotropy = 8
  return { map, emissiveMap }
}

/** Soft round glow for light halos. */
function haloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.15, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

export function createDeckhouse(group: THREE.Group, keep: Keep) {
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#3a4a52', roughness: 0.7, metalness: 0.5 }))
  const white = keep(new THREE.MeshStandardMaterial({ color: '#cfd9de', roughness: 0.6, metalness: 0.1 }))
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
    return m
  }

  // accommodation block
  const cx = (DECKHOUSE.x0 + DECKHOUSE.x1) / 2
  const depth = DECKHOUSE.x1 - DECKHOUSE.x0
  const base = deckAt(cx)
  // tall enough for the bridge to see over the stacks, as on a real container ship
  const storeys = 8
  const storey = 2.95
  const blockH = storeys * storey
  const front = cabinFace(10, storeys, 3)
  const back = cabinFace(10, storeys, 5)
  const side = cabinFace(5, storeys, 7)
  const face = (t: { map: THREE.Texture; emissiveMap: THREE.Texture }) =>
    keep(new THREE.MeshStandardMaterial({ map: keep(t.map), emissive: '#ffffff', emissiveMap: keep(t.emissiveMap), emissiveIntensity: 1.25, roughness: 0.55 }))
  const sideMat = face(side)
  add(new THREE.BoxGeometry(depth, blockH, 22), [face(front), face(back), white, white, sideMat, sideMat], cx, base + blockH / 2, 0)

  // bridge deck, wider than the ship, with its wraparound windows
  const bridgeY = base + blockH + 1.55
  add(new THREE.BoxGeometry(depth - 2.5, 3.1, HULL.beam + 3), white, cx - 0.6, bridgeY, 0)
  const glass = keep(new THREE.MeshPhysicalMaterial({ color: '#0d2a33', roughness: 0.08, metalness: 0.4, emissive: '#2a8f9c', emissiveIntensity: 0.22, clearcoat: 1 }))
  add(new THREE.BoxGeometry(0.25, 1.25, HULL.beam + 2.6), glass, cx + (depth - 2.5) / 2 - 0.5, bridgeY + 0.35, 0)
  for (const s of [1, -1]) add(new THREE.BoxGeometry(depth - 3.5, 1.25, 0.25), glass, cx - 0.6, bridgeY + 0.35, s * (HULL.beam / 2 + 1.55))
  add(new THREE.BoxGeometry(depth - 2, 0.35, HULL.beam + 3.4), steel, cx - 0.6, bridgeY + 1.75, 0)

  // wing railings
  const rails = keep(new THREE.BufferGeometry())
  const pts: number[] = []
  for (const s of [1, -1]) {
    const z0 = s * 11
    const z1 = s * (HULL.beam / 2 + 1.5)
    for (const y of [bridgeY + 1.95, bridgeY + 2.6]) pts.push(cx + 4, y, z0, cx + 4, y, z1)
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z += 1.2) pts.push(cx + 4, bridgeY + 1.9, z, cx + 4, bridgeY + 2.6, z)
  }
  rails.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  group.add(new THREE.LineSegments(rails, keep(new THREE.LineBasicMaterial({ color: '#9fb2bc' }))))

  // radar mast: a truss on the compass deck, two scanners, masthead light
  const mastBase = bridgeY + 1.95
  add(new THREE.CylinderGeometry(0.28, 0.4, 9, 8), steel, cx - 1.5, mastBase + 4.5, 0)
  add(new THREE.BoxGeometry(0.3, 0.3, 8), steel, cx - 1.5, mastBase + 6.5, 0)
  const scanners = [
    add(new THREE.BoxGeometry(0.35, 0.22, 5.5), white, cx - 1.5, mastBase + 7.2, 2.6),
    add(new THREE.BoxGeometry(0.35, 0.22, 4.2), white, cx - 1.5, mastBase + 7.2, -2.6),
  ]
  add(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), steel, cx - 1.5, mastBase + 11, 0)

  // funnel aft, raked, with the brand mark
  const fBase = deckAt(FUNNEL_X)
  add(new THREE.BoxGeometry(16, 5, 20), steel, FUNNEL_X + 2, fBase + 2.5, 0)
  const funnelGeo = new THREE.BoxGeometry(9, 15, 8, 1, 1, 1)
  const fp = funnelGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < fp.count; i++) if (fp.getY(i) > 0) fp.setX(i, fp.getX(i) * 0.8 - 1.4)
  funnelGeo.computeVertexNormals()
  const livery = keep(funnelLivery())
  const liveryMat = keep(new THREE.MeshStandardMaterial({ map: livery, roughness: 0.45, metalness: 0.2 }))
  const navy = keep(new THREE.MeshStandardMaterial({ color: '#0a2643', roughness: 0.45, metalness: 0.2 }))
  const soot = keep(new THREE.MeshStandardMaterial({ color: '#07090b', roughness: 0.95 }))
  add(funnelGeo, [navy, navy, soot, soot, liveryMat, liveryMat], FUNNEL_X, fBase + 5 + 7.5, 0)
  for (const z of [-1.6, 0, 1.6]) add(new THREE.CylinderGeometry(0.55, 0.55, 2, 12), soot, FUNNEL_X - 2.4, fBase + 5 + 15.6, z)

  // free-fall lifeboat on its ramp over the stern
  const boat = add(
    new THREE.CapsuleGeometry(1.4, 6.5, 6, 14),
    keep(new THREE.MeshStandardMaterial({ color: '#f26b1d', roughness: 0.45, emissive: '#f26b1d', emissiveIntensity: 0.08 })),
    HULL.stern + 6,
    deckAt(HULL.stern) + 4.2,
    0,
  )
  boat.rotation.z = Math.PI / 2 - 0.42

  // forecastle: foremast, windlasses
  const bowDeck = deckAt(80)
  add(new THREE.CylinderGeometry(0.3, 0.45, 11, 8), steel, 80, bowDeck + 5.5, 0)
  add(new THREE.BoxGeometry(0.3, 0.3, 4), steel, 80, bowDeck + 8.5, 0)
  for (const z of [-4, 4]) add(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 14), steel, 74, bowDeck + 1.1, z).rotation.x = Math.PI / 2

  // navigation lights with halos: red to port, green to starboard, white masthead and stern lights
  const halo = keep(haloTexture())
  const lights: { mesh: THREE.Mesh; sprite: THREE.Sprite }[] = []
  const navLight = (hex: string, x: number, y: number, z: number, size = 5) => {
    const color = new THREE.Color(hex)
    const mesh = add(new THREE.SphereGeometry(0.3, 10, 8), keep(new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(6) })), x, y, z)
    mesh.castShadow = false
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: halo, color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })))
    sprite.scale.setScalar(size)
    sprite.position.set(x, y, z)
    group.add(sprite)
    lights.push({ mesh, sprite })
  }
  navLight('#ff3b30', cx + 3, bridgeY + 0.4, -(HULL.beam / 2 + 1.7))
  navLight('#2bff88', cx + 3, bridgeY + 0.4, HULL.beam / 2 + 1.7)
  navLight('#fff4e0', cx - 1.5, mastBase + 11.2, 0, 7)
  navLight('#fff4e0', 80, bowDeck + 11.2, 0, 7)
  navLight('#fff4e0', HULL.stern + 1, deckAt(HULL.stern) + 2, 0)

  // floodlights: sodium from the bridge front over the forward bays, cooler LEDs from the foremast
  const spot = (hex: string, intensity: number, from: THREE.Vector3, to: THREE.Vector3, angle: number) => {
    const l = new THREE.SpotLight(hex, intensity, 160, angle, 0.65, 1.4)
    l.position.copy(from)
    l.target.position.copy(to)
    group.add(l, l.target)
  }
  // on the bridge wing ends, outboard of the stacks, so they rake along the cargo instead of lighting the bridge
  spot('#ffbe80', 1800, new THREE.Vector3(DECKHOUSE.x1 + 1, bridgeY + 6, HULL.beam / 2 + 1), new THREE.Vector3(40, base + 6, 14), 0.45)
  spot('#ffbe80', 1800, new THREE.Vector3(DECKHOUSE.x1 + 1, bridgeY + 6, -(HULL.beam / 2 + 1)), new THREE.Vector3(40, base + 6, -14), 0.45)
  spot('#dbe8ff', 650, new THREE.Vector3(79, bowDeck + 9, 0), new THREE.Vector3(40, base + 14, 0), 0.7)
  spot('#ffbe80', 1600, new THREE.Vector3(DECKHOUSE.x0 - 4, bridgeY + 4, 0), new THREE.Vector3(-45, base + 12, 0), 0.7)
  // pools of light from the lashing bridges, the way container decks glow at night
  // hung outboard, never over the memo tier, so its lettering stays readable from above
  for (const [x, z] of [[-58, 13], [-32, -13], [10, 15], [36, -15]]) {
    const l = new THREE.PointLight(x > 0 ? '#e9eefc' : '#ffc994', 160, 40, 1.5)
    l.position.set(x, base + 26, z)
    group.add(l)
  }

  return {
    update(time: number) {
      scanners[0].rotation.y = time * 1.4
      scanners[1].rotation.y = -time * 0.9
      // halos breathe a little, like light through sea air
      lights.forEach((l, i) => (l.sprite.material.opacity = 0.45 + 0.12 * Math.sin(time * 1.3 + i)))
    },
  }
}
