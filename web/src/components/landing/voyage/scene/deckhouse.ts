import * as THREE from 'three'
import { deckAt, HULL } from './hull'
import { DECKHOUSE } from './stowage'
import { createAccommodation } from './superstructure/accommodation'
import { createBridge } from './superstructure/bridge'
import { createFunnel } from './superstructure/funnel'
import { createLifeboat } from './superstructure/lifeboat'

// The superstructure, put together: the accommodation block, the bridge and its mast, the funnel on its engine
// casing aft, the free-fall lifeboat over the stern (each in superstructure/), then the forecastle gear, the
// navigation lights with their halos and the floodlights that light the deck at night.

type Keep = <T extends { dispose(): void }>(x: T) => T

/** Soft round glow for light halos. */
export function haloTexture() {
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
  const soot = keep(new THREE.MeshStandardMaterial({ color: '#07090b', roughness: 0.95 }))
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(keep(geo), mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
    return m
  }

  const block = createAccommodation(group, keep)
  const bridge = createBridge(group, keep, block, { steel })
  const funnel = createFunnel(group, keep, { steel, soot })
  createLifeboat(group, keep, { steel })

  // forecastle: foremast, windlasses
  const bowDeck = deckAt(80)
  add(new THREE.CylinderGeometry(0.3, 0.45, 11, 8), steel, 80, bowDeck + 5.5, 0)
  add(new THREE.BoxGeometry(0.3, 0.3, 4), steel, 80, bowDeck + 8.5, 0)
  for (const z of [-4, 4]) add(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 14), steel, 74, bowDeck + 1.1, z).rotation.x = Math.PI / 2

  // navigation lights with halos: red to port, green to starboard, white masthead and stern lights
  const halo = keep(haloTexture())
  const lights: { sprite: THREE.Sprite }[] = []
  const navLight = (hex: string, x: number, y: number, z: number, size = 5) => {
    const color = new THREE.Color(hex)
    const mesh = add(new THREE.SphereGeometry(0.3, 10, 8), keep(new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(6) })), x, y, z)
    mesh.castShadow = false
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: halo, color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })))
    sprite.scale.setScalar(size)
    sprite.position.set(x, y, z)
    group.add(sprite)
    lights.push({ sprite })
  }
  navLight('#ff3b30', block.cx + 0.5, bridge.floor + 2.2, -(bridge.wingEnd + 0.2))
  navLight('#2bff88', block.cx + 0.5, bridge.floor + 2.2, bridge.wingEnd + 0.2)
  navLight('#fff4e0', bridge.mast.x, bridge.mast.top, 0, 7)
  navLight('#fff4e0', 80, bowDeck + 11.2, 0, 7)
  navLight('#fff4e0', HULL.stern + 1, deckAt(HULL.stern) + 2, 0)
  navLight('#ffb070', funnel.cx, funnel.top + 1.5, 0, 3)

  // floodlights: sodium from the bridge front over the forward bays, cooler LEDs from the foremast
  const spot = (hex: string, intensity: number, from: THREE.Vector3, to: THREE.Vector3, angle: number) => {
    const l = new THREE.SpotLight(hex, intensity, 160, angle, 0.65, 1.4)
    l.position.copy(from)
    l.target.position.copy(to)
    group.add(l, l.target)
  }
  const flood = bridge.floor + 5.5
  // on the bridge wing ends, outboard of the stacks, so they rake along the cargo instead of lighting the bridge
  spot('#ffbe80', 1800, new THREE.Vector3(DECKHOUSE.x1 + 1, flood + 2, HULL.beam / 2 + 1), new THREE.Vector3(40, block.base + 6, 14), 0.45)
  spot('#ffbe80', 1800, new THREE.Vector3(DECKHOUSE.x1 + 1, flood + 2, -(HULL.beam / 2 + 1)), new THREE.Vector3(40, block.base + 6, -14), 0.45)
  spot('#dbe8ff', 650, new THREE.Vector3(79, bowDeck + 9, 0), new THREE.Vector3(40, block.base + 14, 0), 0.7)
  // aft, from halfway up the accommodation, so it lights the after stacks and not the bridge above it
  spot('#ffbe80', 1600, new THREE.Vector3(DECKHOUSE.x0 - 2, block.base + block.blockH * 0.6, 0), new THREE.Vector3(-45, block.base + 8, 0), 0.7)
  // pools of light from the lashing bridges, the way container decks glow at night
  // hung outboard, never over the memo tier, so its lettering stays readable from above
  // and clear of the accommodation, so they never blow out its white walls
  for (const [x, z] of [[-60, 13], [-44, -13], [10, 15], [36, -15]]) {
    const l = new THREE.PointLight(x > 0 ? '#e9eefc' : '#ffc994', 160, 40, 1.5)
    l.position.set(x, block.base + 26, z)
    group.add(l)
  }

  return {
    funnel,
    /** Parts that move on their own (the radar scanners), kept out of the static merge. */
    moving: bridge.scanners,
    update(time: number) {
      bridge.scanners[0].rotation.y = time * 1.4
      bridge.scanners[1].rotation.y = -time * 0.9
      // halos breathe a little, like light through sea air
      lights.forEach((l, i) => (l.sprite.material.opacity = 0.45 + 0.12 * Math.sin(time * 1.3 + i)))
    },
  }
}
