import * as THREE from 'three'
import { deckGeometry, HULL } from '../hull'
import { addBreakwater } from './breakwater'
import { forecastleDeck } from './deckPaint'
import { addFittings } from './fittings'
import { FORECASTLE } from './layout'
import { addWinches, ropeTexture } from './winches'

// The forecastle, seen mostly from above in the cargo chapter: its painted deck, the breakwater, the anchor and
// mooring machinery with the cables, and the fittings round it. Returns the foremast, which carries the masthead
// light and a floodlight (deckhouse.ts).

type Keep = <T extends { dispose(): void }>(x: T) => T

export function createForecastle(group: THREE.Group, keep: Keep, shared: { rail: THREE.Material; white: THREE.Material }, { detail }: { detail: boolean }) {
  const deck = new THREE.Mesh(
    keep(deckGeometry(0.25, FORECASTLE.paint, HULL.bow)),
    keep(new THREE.MeshStandardMaterial({ map: keep(forecastleDeck(detail ? 1536 : 768)), roughness: 0.85, metalness: 0.12 })),
  )
  deck.receiveShadow = true
  group.add(deck)

  // deck machinery paint, a little lighter than the deck so the gear reads against it at night
  const paint = keep(new THREE.MeshStandardMaterial({ color: '#7b8f88', roughness: 0.6, metalness: 0.3 }))
  const dark = keep(new THREE.MeshStandardMaterial({ color: '#23292c', roughness: 0.5, metalness: 0.6 }))
  const bright = keep(new THREE.MeshStandardMaterial({ color: '#b3bec2', roughness: 0.3, metalness: 0.85 }))
  const rope = keep(new THREE.MeshStandardMaterial({ map: keep(ropeTexture()), roughness: 0.9 }))
  const chain = keep(new THREE.MeshStandardMaterial({ color: '#626a6e', roughness: 0.45, metalness: 0.7 }))
  const plate = keep(new THREE.MeshStandardMaterial({ color: '#3b4c4f', roughness: 0.7, metalness: 0.4 }))

  addBreakwater(group, keep, { plate, edge: shared.rail })
  addWinches(group, keep, { paint, dark, bright, rope, chain }, { detail })
  return addFittings(group, keep, { paint, dark, bright, white: shared.white, rail: shared.rail }, { detail })
}
