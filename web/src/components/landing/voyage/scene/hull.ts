import * as THREE from 'three'

// A container ship hull lofted from cross sections, in scene units of about one metre. The ship sails towards +x,
// starboard is +z and the waterline is y = 0. Midships the section is a flat bottom with a round bilge; towards the
// bow it becomes a flared V with a raked stem; aft, the underwater body narrows into the run.

export const HULL = {
  stern: -96,
  bow: 96,
  beam: 32,
  keel: -11,
  deck: 12,
  /** How much the deck rises towards the bow. */
  sheer: 3.5,
  /** Where the parallel midbody ends and the bow starts to taper. */
  shoulder: 38,
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Deck height at x: flat midships, rising at the bow and slightly at the stern. */
export const deckAt = (x: number) => HULL.deck + HULL.sheer * smooth(HULL.shoulder - 10, HULL.bow, x) ** 1.6 + 0.8 * smooth(-70, HULL.stern, x)

/** Waterline height as a fraction of the hull depth at midships (used by the ocean shader too). */
export const WATERLINE = -HULL.keel / (HULL.deck - HULL.keel)

/**
 * Half breadth of the hull at length x and height fraction s (0 at the keel, 1 at the deck edge).
 * Zero beyond the stem, which rakes forward as it rises.
 */
export function halfBreadth(x: number, s: number) {
  const half = HULL.beam / 2
  const stem = 86.5 + 9.5 * s
  if (x >= stem) return 0
  let plan = 1
  if (x > HULL.shoulder) {
    const t = clamp01((x - HULL.shoulder) / (stem - HULL.shoulder))
    plan = Math.max(1 - t ** 2.1, 0) ** 0.62
  } else if (x < -64) {
    plan = 1 - 0.16 * clamp01((-64 - x) / 32) ** 1.6
    // the stern rounds off in plan, so the transom is narrower than the beam and the quarters curve into it
    const round = clamp01((-80 - x) / 16)
    plan *= Math.sqrt(1 - 0.5 * round * round)
  }

  // flat bottom with a round bilge midships, a V forward
  const bilgeR = 0.2
  const bilge = s < bilgeR ? 0.72 + 0.28 * Math.sqrt(1 - ((bilgeR - s) / bilgeR) ** 2) : 1
  const vee = s ** 0.8
  const bowness = smooth(HULL.shoulder - 22, 90, x)
  let section = bilge + (vee - bilge) * bowness

  // the run: underwater body narrows towards the propeller
  const aft = smooth(-46, -92, x)
  if (s < WATERLINE) section *= 1 - aft * 0.82 * (1 - s / WATERLINE) ** 1.15

  return half * plan * section
}

const STATIONS = 180
const LEVELS = 30

/**
 * The hull shell, both sides. UVs: u runs along the hull so the livery reads left to right on both sides
 * (stern to bow on starboard, bow to stern on port); v runs from the keel to the deck edge.
 */
export function hullGeometry() {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const top = HULL.deck + HULL.sheer + 0.8

  for (const side of [1, -1]) {
    const base = positions.length / 3
    for (let i = 0; i <= STATIONS; i++) {
      const x = HULL.stern + (i / STATIONS) * (HULL.bow - HULL.stern)
      const deck = deckAt(x)
      const u = (x - HULL.stern) / (HULL.bow - HULL.stern)
      // centreline of the flat bottom first, then up the side
      positions.push(x, HULL.keel, 0)
      uvs.push(side === 1 ? u : 1 - u, 0)
      for (let j = 0; j <= LEVELS; j++) {
        const s = j / LEVELS
        const y = HULL.keel + s * (deck - HULL.keel)
        positions.push(x, y, side * halfBreadth(x, s))
        uvs.push(side === 1 ? u : 1 - u, (y - HULL.keel) / (top - HULL.keel))
      }
    }
    const ring = LEVELS + 2
    for (let i = 0; i < STATIONS; i++) {
      for (let j = 0; j < ring - 1; j++) {
        const a = base + i * ring + j
        const b = a + ring
        // keep the winding outward on both sides
        if (side === 1) indices.push(a, b, a + 1, a + 1, b, b + 1)
        else indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The weather deck from x0 to x1: a strip between the two deck edges, following the sheer. UVs map the plan:
 * u runs from x0 to x1, v across the full beam from port (0) to starboard (1), for a painted deck.
 */
export function deckGeometry(inset = 0.25, x0 = HULL.stern, x1 = HULL.bow) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const stations = Math.max(8, Math.round((STATIONS * (x1 - x0)) / (HULL.bow - HULL.stern)))
  for (let i = 0; i <= stations; i++) {
    const x = x0 + (i / stations) * (x1 - x0)
    const w = Math.max(halfBreadth(x, 1) - inset, 0)
    const y = deckAt(x) - 0.05
    positions.push(x, y, -w, x, y, w)
    const u = i / stations
    uvs.push(u, 0.5 - w / HULL.beam, u, 0.5 + w / HULL.beam)
    if (i < stations) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** The transom: the flat stern face. */
export function transomGeometry() {
  const shape = new THREE.Shape()
  const x = HULL.stern
  const deck = deckAt(x)
  const steps = 16
  for (let j = 0; j <= steps; j++) {
    const s = j / steps
    const y = HULL.keel + s * (deck - HULL.keel)
    const z = halfBreadth(x, s)
    if (j === 0) shape.moveTo(-z, y)
    else shape.lineTo(-z, y)
  }
  for (let j = steps; j >= 0; j--) {
    const s = j / steps
    shape.lineTo(halfBreadth(x, s), HULL.keel + s * (deck - HULL.keel))
  }
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateY(-Math.PI / 2)
  geometry.translate(x, 0, 0)
  return geometry
}
