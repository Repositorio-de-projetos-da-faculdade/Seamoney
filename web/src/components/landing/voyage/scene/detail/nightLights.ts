import * as THREE from 'three'
import { haloTexture } from '../deckhouse'
import { deckAt, halfBreadth } from '../hull'
import { ACCOMMODATION, BAYS, BOX40, DECKHOUSE } from '../stowage'

// What makes a ship read at night: strings of walkway lamps along both sides and round the accommodation, and
// floodlights on the lashing bridges throwing visible beams through the sea mist onto the stacks. On a live page the
// lamps are only bulbs and halos; with `lit` (the pre-rendered frames) each one also lights its surroundings, and the
// floodlights and their beams are added: dozens of lights are fine offline, not in real time.

type Keep = <T extends { dispose(): void }>(x: T) => T

const beamVertex = /* glsl */ `
  varying float vAlong;
  varying float vFacing;
  void main() {
    vAlong = uv.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vFacing = abs(dot(n, normalize(cameraPosition - world.xyz)));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlong;
  varying float vFacing;
  void main() {
    // brightest at the lamp, fading along the beam; soft at its silhouette edges
    float a = uOpacity * pow(vAlong, 1.8) * pow(vFacing, 1.6);
    gl_FragColor = vec4(uColor * a, a);
  }
`

// The lamps' halos as one cloud of points, sized in world units like a sprite would be (projectionMatrix[1][1] is
// 1 / tan(fov / 2)), so dozens of halos cost one draw call instead of one each.
const haloVertex = /* glsl */ `
  attribute float size;
  attribute vec3 tint;
  uniform float uHalfHeight;
  varying vec3 vTint;
  void main() {
    vTint = tint;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * projectionMatrix[1][1] * uHalfHeight / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const haloFragment = /* glsl */ `
  uniform sampler2D map;
  varying vec3 vTint;
  void main() {
    float a = texture2D(map, gl_PointCoord).a * 0.5;
    gl_FragColor = vec4(vTint * a, a);
  }
`

function haloCloud(keep: Keep, halo: THREE.Texture, halos: { at: THREE.Vector3; color: THREE.Color; size: number }[]) {
  const geometry = keep(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(halos.flatMap((h) => h.at.toArray()), 3))
  geometry.setAttribute('tint', new THREE.Float32BufferAttribute(halos.flatMap((h) => h.color.toArray()), 3))
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(halos.map((h) => h.size), 1))
  const material = keep(
    new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: { map: { value: halo }, uHalfHeight: { value: 500 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const points = new THREE.Points(geometry, material)
  const size = new THREE.Vector2()
  // the reflection renders at its own resolution, so the size follows whatever is being drawn into
  points.onBeforeRender = (renderer) => {
    const target = renderer.getRenderTarget()
    material.uniforms.uHalfHeight.value = (target ? target.height : renderer.getDrawingBufferSize(size).y) / 2
  }
  points.frustumCulled = false
  return points
}

export function addNightLights(group: THREE.Group, keep: Keep, { lit }: { lit: boolean }) {
  const halo = keep(haloTexture())
  const bulbGeo = keep(new THREE.SphereGeometry(0.18, 8, 6))

  // one material per lamp colour, so the bulbs merge into a single mesh (mergeStatic.ts)
  const bulbs = new Map<string, THREE.MeshBasicMaterial>()
  const bulbMat = (hex: string) => {
    if (!bulbs.has(hex)) bulbs.set(hex, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(5) })))
    return bulbs.get(hex)!
  }

  const halos: { at: THREE.Vector3; color: THREE.Color; size: number }[] = []
  const lamp = (x: number, y: number, z: number, hex: string, { size = 2.6, power = 35, reach = 16 } = {}) => {
    const bulb = new THREE.Mesh(bulbGeo, bulbMat(hex))
    bulb.position.set(x, y, z)
    group.add(bulb)
    halos.push({ at: bulb.position.clone(), color: new THREE.Color(hex), size })
    if (!lit || !power) return
    const light = new THREE.PointLight(hex, power, reach, 2)
    light.position.copy(bulb.position)
    group.add(light)
  }

  // walkway lamps along both sides, on the railing posts
  for (let x = -88; x <= 56; x += 12) {
    for (const s of [1, -1]) lamp(x, deckAt(x) + 1.6, s * (halfBreadth(x, 1) - 0.5), '#ffcf96')
  }

  // lamps at the corners of the accommodation walkways, every other storey
  const { x0, x1 } = DECKHOUSE
  const half = ACCOMMODATION.width / 2 + 1
  const base = deckAt((x0 + x1) / 2)
  for (let k = 1; k < ACCOMMODATION.storeys; k += 2) {
    const y = base + k * ACCOMMODATION.storey + 2.2
    for (const [x, z] of [[x0 - 1, half], [x0 - 1, -half], [x1 + 1, half], [x1 + 1, -half]]) lamp(x, y, z, '#ffe2b8', { size: 2, power: 25, reach: 12 })
  }

  if (lit) addFloodlights(group, keep, lamp)
  group.add(haloCloud(keep, halo, halos))
}

/** Floodlights on the lashing bridges, aimed down the stack faces, with their beams in the mist (offline only). */
function addFloodlights(group: THREE.Group, keep: Keep, lamp: (x: number, y: number, z: number, hex: string, o?: { size?: number; power?: number }) => void) {
  // floodlights on the lashing bridges, aimed down the stack faces, with their beams in the mist
  const beamGeo = keep(new THREE.CylinderGeometry(0.25, 1, 1, 24, 1, true))
  // apex at the lamp (top), opening downwards; uv.y runs 0 at the bottom to 1 at the apex
  beamGeo.translate(0, -0.5, 0)
  const beamMat = (hex: string, opacity: number) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: opacity } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    )
  const sodium = beamMat('#ffb870', 0.3)
  const up = new THREE.Vector3(0, 1, 0)
  for (const b of BAYS.filter((_, i) => i % 2 === 0)) {
    for (const s of [1, -1]) {
      const from = new THREE.Vector3(b.x + BOX40.l / 2 + 0.6, b.base + b.tiers[0] * 2.64 + 3, s * (b.half * 2.5 + 0.8))
      const to = new THREE.Vector3(b.x - 4, b.base + 2, s * (b.half * 2.5 - 6))
      const spot = new THREE.SpotLight('#ffbe80', 900, 60, 0.5, 0.7, 1.6)
      spot.position.copy(from)
      spot.target.position.copy(to)
      group.add(spot, spot.target)
      const len = from.distanceTo(to) * 1.1
      const beam = new THREE.Mesh(beamGeo, sodium)
      beam.position.copy(from)
      beam.scale.set(len * 0.42, len, len * 0.42)
      beam.quaternion.setFromUnitVectors(up, from.clone().sub(to).normalize())
      group.add(beam)
      lamp(from.x, from.y, from.z, '#ffd6a0', { size: 1.4, power: 0 })
    }
  }
}
