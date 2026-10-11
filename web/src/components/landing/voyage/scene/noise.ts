import * as THREE from 'three'

// Value noise baked once into a texture, so the water and the sky read it instead of hashing it on every pixel.
// Each texel holds the noise and its two derivatives (smoothstep interpolation, computed exactly), so the ripples
// get their slope from one lookup per octave instead of three. It repeats every CELLS lattice cells; the shaders
// layer octaves at non-integer scales, so the repeat never lines up on screen.

const CELLS = 64
const TEXELS_PER_CELL = 4
const SIZE = CELLS * TEXELS_PER_CELL

function lattice() {
  // a fixed seed, so the water looks the same on every visit
  let s = 1234567
  const values = new Float32Array(CELLS * CELLS)
  for (let i = 0; i < values.length; i++) values[i] = (s = (s * 16807) % 2147483647) / 2147483647
  return values
}

export function createNoiseTexture() {
  const values = lattice()
  const at = (x: number, y: number) => values[(y & (CELLS - 1)) * CELLS + (x & (CELLS - 1))]
  const data = new Uint16Array(SIZE * SIZE * 4)
  for (let ty = 0; ty < SIZE; ty++) {
    for (let tx = 0; tx < SIZE; tx++) {
      // texel centres, so a lookup at p / CELLS lands on the noise at p under linear filtering
      const x = (tx + 0.5) / TEXELS_PER_CELL
      const y = (ty + 0.5) / TEXELS_PER_CELL
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const fx = x - ix
      const fy = y - iy
      const ux = fx * fx * (3 - 2 * fx)
      const uy = fy * fy * (3 - 2 * fy)
      const a = at(ix, iy)
      const b = at(ix + 1, iy)
      const c = at(ix, iy + 1)
      const d = at(ix + 1, iy + 1)
      const k = a - b - c + d
      const o = (ty * SIZE + tx) * 4
      data[o] = THREE.DataUtils.toHalfFloat(a + (b - a) * ux + (c - a) * uy + k * ux * uy)
      data[o + 1] = THREE.DataUtils.toHalfFloat(6 * fx * (1 - fx) * (b - a + k * uy))
      data[o + 2] = THREE.DataUtils.toHalfFloat(6 * fy * (1 - fy) * (c - a + k * ux))
      data[o + 3] = 0
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.HalfFloatType)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/**
 * GLSL for the baked noise: noiseD returns (value, d/dx, d/dy), noise only the value. Needs the tNoise uniform.
 * textureLod, because the shaders read it inside loops and branches, where screen-space derivatives are undefined.
 */
export const noiseChunk = /* glsl */ `
  uniform sampler2D tNoise;
  vec3 noiseD(vec2 p) { return textureLod(tNoise, p * ${(1 / CELLS).toFixed(6)}, 0.0).rgb; }
  float noise(vec2 p) { return noiseD(p).r; }
`
