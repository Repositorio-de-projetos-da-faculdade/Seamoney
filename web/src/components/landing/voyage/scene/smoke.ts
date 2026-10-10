import * as THREE from 'three'
import { deckAt } from './hull'
import { FUNNEL_X } from './stowage'

// Exhaust from the funnel: soft particles that rise, swell and fade, trailing astern with the ship's speed.

const COUNT = 70
const LIFE = 9

const vertex = /* glsl */ `
  attribute float aAge;
  attribute float aSeed;
  uniform float uScale;
  varying float vAge;
  varying float vSeed;
  void main() {
    vAge = aAge;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (4.0 + aAge * 22.0) * uScale / -mv.z;
  }
`

const fragment = /* glsl */ `
  varying float vAge;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float puff = smoothstep(0.5, 0.0, d) * (0.8 + 0.2 * sin(vSeed * 40.0 + c.x * 9.0));
    float alpha = puff * smoothstep(0.0, 0.08, vAge) * (1.0 - smoothstep(0.35, 1.0, vAge)) * 0.16;
    gl_FragColor = vec4(vec3(0.16, 0.19, 0.22), alpha);
  }
`

export function createSmoke() {
  const positions = new Float32Array(COUNT * 3)
  const ages = new Float32Array(COUNT)
  const seeds = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    ages[i] = i / COUNT
    seeds[i] = Math.random()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uScale: { value: 300 } },
    transparent: true,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const top = new THREE.Vector3(FUNNEL_X - 2.4, deckAt(FUNNEL_X) + 21, 0)
  let last = 0

  return {
    points,
    setScale(pixelHeight: number) {
      material.uniforms.uScale.value = pixelHeight * 0.55
    },
    update(time: number, speed: number) {
      const dt = Math.min(0.1, time - last)
      last = time
      for (let i = 0; i < COUNT; i++) {
        ages[i] += dt / LIFE
        if (ages[i] >= 1) ages[i] -= 1
        const a = ages[i]
        const s = seeds[i]
        positions[i * 3] = top.x - a * (26 + 30 * speed) + Math.sin(s * 30 + time * 0.3) * a * 3
        positions[i * 3 + 1] = top.y + a * 16 + s * 1.5
        positions[i * 3 + 2] = top.z + (s - 0.5) * 3 + Math.sin(s * 11 + time * 0.2) * a * 4
      }
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aAge.needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
