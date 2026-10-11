import * as THREE from 'three'
import { deckAt } from '../hull'
import { chainCable } from './chain'
import { cablePath, HAWSE_X, hawseZ, MOORING, STOPPER_X, WINDLASS } from './layout'

// The forecastle machinery, built along a shaft that runs across the ship. Each windlass has, from outboard in: the
// band brake, the gypsy (the pocketed wheel that grips the anchor cable), a mooring drum wound with rope, the gear
// case with its hydraulic motor and a warping head. The mooring winches aft carry a split drum. The anchor cables
// run from the spurling pipes, over the gypsies and through the bow stoppers into the deck hawse pipes.

type Keep = <T extends { dispose(): void }>(x: T) => T

export interface WinchMaterials {
  paint: THREE.Material
  dark: THREE.Material
  bright: THREE.Material
  rope: THREE.Material
  chain: THREE.Material
}

/** Rope wound on a drum: wraps round the circumference, strands laid at an angle. */
export function ropeTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#d8c98e'
  g.fillRect(0, 0, 128, 256)
  const wraps = 16
  const h = 256 / wraps
  for (let k = 0; k < wraps; k++) {
    const y = k * h
    g.fillStyle = 'rgba(70,55,25,0.55)'
    g.fillRect(0, y, 128, 2)
    // the strands of a three-strand lay, slanting across each wrap
    g.strokeStyle = 'rgba(110,90,45,0.4)'
    g.lineWidth = 2
    for (let x = -h; x < 128; x += 9) {
      g.beginPath()
      g.moveTo(x, y + h)
      g.lineTo(x + h, y + 2)
      g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function addWinches(group: THREE.Group, keep: Keep, mats: WinchMaterials, { detail }: { detail: boolean }) {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(keep(geo), mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  /** A wheel or drum on the shaft: a cylinder turned so its axis runs across the ship. */
  const wheel = (r: number, width: number, mat: THREE.Material, x: number, y: number, z: number, sides = 24) => {
    const mesh = add(new THREE.CylinderGeometry(r, r, width, sides), mat, x, y, z)
    mesh.rotation.x = Math.PI / 2
    return mesh
  }
  const drum = (x: number, y: number, z0: number, z1: number, r = 0.62) => {
    const len = Math.abs(z1 - z0)
    const z = (z0 + z1) / 2
    wheel(r, len, mats.rope, x, y, z, 20)
    for (const end of [z0, z1]) wheel(1.12, 0.1, mats.paint, x, y, end)
  }
  const pedestal = (x: number, deck: number, y: number, z: number) => add(new THREE.BoxGeometry(1.1, y - deck + 0.35, 0.36), mats.paint, x, (deck + y + 0.35) / 2, z)
  const gearCase = (x: number, deck: number, y: number, z: number, s: number) => {
    add(new THREE.BoxGeometry(1.9, y - deck + 0.7, 0.78), mats.paint, x - 0.1, (deck + y + 0.7) / 2, z)
    // hydraulic motor flanged on the aft side of the gear case, and its piping
    const motor = add(new THREE.CylinderGeometry(0.42, 0.42, 1, 14), mats.dark, x - 1.45, y - 0.15, z)
    motor.rotation.z = Math.PI / 2
    if (detail) add(new THREE.BoxGeometry(0.12, 0.12, 1.6), mats.bright, x - 1.3, deck + 0.35, z - s * 0.6)
  }
  const warpingHead = (x: number, y: number, z: number, s: number) => {
    const head = add(new THREE.CylinderGeometry(0.36, 0.5, 0.75, 18), mats.bright, x, y, z)
    head.rotation.x = (s * Math.PI) / 2
  }
  const shaft = (x: number, y: number, z0: number, z1: number) => wheel(0.16, Math.abs(z1 - z0), mats.bright, x, y, (z0 + z1) / 2, 10)

  for (const s of [1, -1] as const) {
    // windlass
    {
      const x = WINDLASS.x
      const deck = deckAt(x)
      const y = deck + 1.2
      const z = (v: number) => s * v
      add(new THREE.BoxGeometry(3.4, 0.3, 5.6), mats.paint, x, deck + 0.15, z(4.25))
      shaft(x, y, z(1.6), z(6.5))
      // the gypsy: a seven-pocket wheel between two flanges, then the brake drum and its band outboard
      wheel(0.95, 0.5, mats.dark, x, y, z(WINDLASS.gypsyZ), 7)
      for (const dz of [-0.31, 0.31]) wheel(1.05, 0.1, mats.dark, x, y, z(WINDLASS.gypsyZ + dz), 20)
      wheel(1.15, 0.32, mats.dark, x, y, z(WINDLASS.gypsyZ + 0.62))
      wheel(1.21, 0.24, mats.paint, x, y, z(WINDLASS.gypsyZ + 0.62))
      // brake spindle with its handwheel, forward of the brake
      add(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), mats.bright, x + 1.35, deck + 1.1, z(WINDLASS.gypsyZ + 0.62))
      const hand = add(new THREE.TorusGeometry(0.32, 0.04, 6, 16), mats.bright, x + 1.35, deck + 1.82, z(WINDLASS.gypsyZ + 0.62))
      hand.rotation.x = Math.PI / 2
      pedestal(x, deck, y, z(5.1))
      drum(x, y, z(4.85), z(3.45))
      pedestal(x, deck, y, z(3.25))
      gearCase(x, deck, y, z(2.7), s)
      warpingHead(x, y, z(1.95), -s)
      // spurling pipe aft of the gypsy, down to the chain locker
      add(new THREE.CylinderGeometry(0.42, 0.48, 0.9, 16), mats.dark, x - 0.85, deck + 0.45, z(WINDLASS.gypsyZ))
    }

    // mooring winch: brake, a split drum (storage and tension parts), the gear case and a warping head
    {
      const x = MOORING.x
      const deck = deckAt(x)
      const y = deck + 1.15
      const z = (v: number) => s * v
      add(new THREE.BoxGeometry(2.8, 0.3, 6.2), mats.paint, x, deck + 0.15, z(7.3))
      shaft(x, y, z(4.3), z(10.2))
      wheel(1.15, 0.3, mats.dark, x, y, z(10))
      drum(x, y, z(9.8), z(7.7))
      pedestal(x, deck, y, z(7.5))
      drum(x, y, z(7.25), z(5.9), 0.55)
      gearCase(x, deck, y, z(5.35), s)
      warpingHead(x, y, z(4.65), -s)
    }

    // bow stopper: a base with two cheeks and the hinged bar that drops across the cable
    {
      const zc = (s * WINDLASS.gypsyZ + hawseZ(s)) / 2
      const deck = deckAt(STOPPER_X)
      add(new THREE.BoxGeometry(1.8, 0.35, 1.3), mats.paint, STOPPER_X, deck + 0.18, zc)
      for (const dz of [-0.5, 0.5]) add(new THREE.BoxGeometry(1.5, 0.75, 0.14), mats.paint, STOPPER_X, deck + 0.55, zc + dz)
      const bar = add(new THREE.BoxGeometry(0.22, 0.18, 1.3), mats.dark, STOPPER_X + 0.2, deck + 1.05, zc)
      bar.rotation.z = 0.5
    }

    // deck hawse pipe: a raised mouth with a lip, and its cover swung back on the hinge
    {
      const z = hawseZ(s)
      const deck = deckAt(HAWSE_X)
      add(new THREE.CylinderGeometry(0.62, 0.7, 0.55, 20), mats.dark, HAWSE_X, deck + 0.27, z)
      add(new THREE.TorusGeometry(0.62, 0.07, 6, 20), mats.paint, HAWSE_X, deck + 0.55, z).rotation.x = Math.PI / 2
      if (detail) {
        const cover = add(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 20), mats.paint, HAWSE_X + 0.95, deck + 0.75, z)
        cover.rotation.z = 1.2
      }
    }

    group.add(chainCable(keep, mats.chain, cablePath(s)))
  }
}
