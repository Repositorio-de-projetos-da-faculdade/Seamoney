import * as THREE from 'three'
import { deckAt, halfBreadth, HULL } from './hull'

// Night ocean. Gerstner waves in the vertex shader; in the fragment shader, a planar reflection of the scene
// (the ship, its lights and the sky, broken up by the waves), moonlight glitter, and the ship's foam: along the
// hull, the bow wave, the propeller wash and the Kelvin wake arms. The foam follows the exact waterline of the
// hull through a lookup texture. The ship stays at the origin; the water flows past it.

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  uniform mat4 uTextureMatrix;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec4 vReflUv;

  const float PI = 3.14159265;

  vec3 gerstner(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float steep = wave.z;
    float k = 2.0 * PI / wave.w;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, vec2(p.x + uFlow, p.z)) - c * uTime);
    float a = steep / k;
    tangent += vec3(-d.x * d.x * steep * sin(f), d.x * steep * cos(f), -d.x * d.y * steep * sin(f));
    binormal += vec3(-d.x * d.y * steep * sin(f), d.y * steep * cos(f), -d.y * d.y * steep * sin(f));
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  void main() {
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 d = vec3(0.0);
    // calmer water right against the hull so the ship sits in the sea, not in a crest
    float calm = smoothstep(20.0, 80.0, length(p.xz * vec2(0.42, 1.0)));
    float far = 1.0 - smoothstep(600.0, 900.0, length(p.xz));
    d += gerstner(vec4(1.0, 0.35, 0.09, 72.0), p, tangent, binormal);
    d += gerstner(vec4(0.6, 1.0, 0.075, 41.0), p, tangent, binormal);
    d += gerstner(vec4(-0.35, 0.9, 0.06, 23.0), p, tangent, binormal);
    d += gerstner(vec4(0.95, -0.45, 0.045, 13.0), p, tangent, binormal);
    p += d * mix(0.3, 1.0, calm) * far;
    vNormal = normalize(cross(binormal, tangent));
    vWorld = p;
    vReflUv = uTextureMatrix * vec4(p.x, 0.0, p.z, 1.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  uniform float uSpeed;
  uniform vec3 uDeep;
  uniform vec3 uSurface;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform vec3 uFoam;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uReflect;
  uniform sampler2D tReflection;
  uniform sampler2D tBeam;
  uniform vec4 uHull; // stern, shoulder, stem at the waterline, half beam
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec4 vReflUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  // half breadth of the hull at the waterline, from the lookup texture (negative outside the hull)
  float halfBeam(float x) {
    float u = (x - uHull.x) / (uHull.z - uHull.x);
    if (u <= 0.0 || u >= 1.0) return -1.0;
    return texture2D(tBeam, vec2(u, 0.5)).r * uHull.w;
  }

  float foamAt(vec2 p) {
    vec2 q = vec2(p.x + uFlow, p.y);
    float grain = fbm(q * 0.3 + vec2(uTime * 0.2, 0.0));
    float fine = fbm(q * 1.3 - vec2(uTime * 0.45, uTime * 0.1));
    float foam = 0.0;
    float az = abs(p.y);
    float stern = uHull.x;
    float shoulder = uHull.y;
    float stem = uHull.z;
    float beam = uHull.w;

    // along the hull, building up towards the bow
    float hb = halfBeam(p.x);
    if (hb > 0.0) {
      float edge = 1.0 - smoothstep(0.0, 1.6 + uSpeed, az - hb);
      float bow = smoothstep(shoulder - 30.0, stem, p.x);
      foam = max(foam, edge * step(hb - 0.4, az) * (0.1 + 0.75 * bow) * (0.6 + 0.4 * uSpeed));
    }
    // bow wave cap at the stem
    foam = max(foam, (1.0 - smoothstep(0.0, 5.0 + 3.0 * uSpeed, length(p - vec2(stem + 0.5, 0.0)))) * 0.9);

    // propeller wash: a widening band behind the stern, broken into streaks
    float back = stern - p.x;
    if (back > 0.0) {
      float w = 6.0 + back * 0.1;
      float band = 1.0 - smoothstep(w * 0.3, w, az);
      float streaks = fbm(vec2(q.x * 0.018, az * 0.32));
      foam = max(foam, band * exp(-back * (0.008 - 0.003 * uSpeed)) * smoothstep(0.32, 0.78, grain * 0.6 + streaks * 0.7));
    }

    // Kelvin wake: two arms leaving the bow shoulders at about 19.5 degrees, broken into crests
    float along = shoulder + 20.0 - p.x;
    if (along > 0.0) {
      float armZ = beam * 0.85 + along * 0.354;
      float dist = abs(az - armZ);
      float width = 1.4 + along * 0.02;
      float crest = smoothstep(0.35, 0.8, fbm(vec2(along * 0.09 + uFlow * 0.09, az * 0.2)));
      foam = max(foam, (1.0 - smoothstep(0.0, width, dist)) * exp(-along * 0.0045) * crest * (0.25 + 0.25 * uSpeed));
    }

    return clamp(foam * smoothstep(0.25, 0.75, grain + fine * 0.6), 0.0, 1.0);
  }

  void main() {
    vec2 q = vec2(vWorld.x + uFlow, vWorld.z);
    // small ripples: they break the reflection up and make the moonlight sparkle
    float e = 0.3;
    float n0 = fbm(q * 0.24 + uTime * 0.12);
    float nx = fbm((q + vec2(e, 0.0)) * 0.24 + uTime * 0.12);
    float nz = fbm((q + vec2(0.0, e)) * 0.24 + uTime * 0.12);
    vec3 ripple = vec3(n0 - nx, 0.0, n0 - nz) * 1.7;
    vec3 n = normalize(vNormal + ripple);

    vec3 v = normalize(cameraPosition - vWorld);
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);

    // reflection of the scene, displaced by the surface normal; stretched vertically like light on real water
    vec2 distort = vec2(n.x, n.z * 2.2) * 0.07;
    vec3 refl = texture2DProj(tReflection, vec4(vReflUv.xy + distort * vReflUv.w, vReflUv.zw)).rgb;
    vec3 r = reflect(-v, n);
    vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.45, r.y));
    refl = mix(sky, refl, uReflect);

    vec3 water = mix(uDeep, uSurface, clamp(vWorld.y * 0.1 + 0.35, 0.0, 1.0));
    vec3 col = mix(water, refl, clamp(fres * 1.15, 0.0, 1.0));

    vec3 h = normalize(uMoonDir + v);
    float nh = max(dot(n, h), 0.0);
    col += uMoonColor * (pow(nh, 700.0) * 4.0 + pow(nh, 90.0) * 0.05);

    float foam = foamAt(vWorld.xz);
    col = mix(col, uFoam * (0.55 + 0.45 * fres), foam * 0.6);

    float dist = length(cameraPosition - vWorld);
    float fog = 1.0 - exp(-pow(dist * uFogDensity, 1.6));
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`

export interface OceanPalette {
  deep: string
  surface: string
  horizon: string
  zenith: string
  moon: string
  foam: string
}

/** Rings of vertices: dense around the ship whichever way the camera looks, flat and fogged out to the horizon. */
function polarGrid(radius: number, rings: number, segments: number, horizon: number) {
  const positions: number[] = [0, 0, 0]
  const indices: number[] = []
  const radii = Array.from({ length: rings }, (_, i) => ((i + 1) / rings) ** 1.35 * radius)
  radii.push(radius * 1.6, radius * 3, horizon)
  for (const r of radii) {
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r)
    }
  }
  for (let s = 0; s < segments; s++) indices.push(0, 1 + ((s + 1) % segments), 1 + s)
  for (let ring = 0; ring < radii.length - 1; ring++) {
    const a = 1 + ring * segments
    const b = a + segments
    for (let s = 0; s < segments; s++) {
      const n = (s + 1) % segments
      indices.push(a + s, a + n, b + s, a + n, b + n, b + s)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

/** Half breadth at the waterline along the hull, normalised to the half beam, for the foam. */
function beamTexture() {
  const N = 512
  const stem = 86.5 + 9.5 * (-HULL.keel / (deckAt(90) - HULL.keel))
  // 8 bits are plenty (6 cm steps) and, unlike float textures, can always be filtered linearly
  const data = new Uint8Array(N * 4)
  for (let i = 0; i < N; i++) {
    const x = HULL.stern + (i / (N - 1)) * (stem - HULL.stern)
    const s = -HULL.keel / (deckAt(x) - HULL.keel)
    data[i * 4] = Math.round((halfBreadth(x, s) / (HULL.beam / 2)) * 255)
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  t.minFilter = t.magFilter = THREE.LinearFilter
  t.needsUpdate = true
  return { texture: t, stem }
}

export function createOcean(palette: OceanPalette, moonDir: THREE.Vector3, rings: number, fogDensity: number, fogColor: THREE.Color) {
  const geometry = polarGrid(900, rings, Math.round(rings * 2.2), 16000)
  const beam = beamTexture()
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uSpeed: { value: 0.4 },
      uTextureMatrix: { value: new THREE.Matrix4() },
      tReflection: { value: null },
      uReflect: { value: 0 },
      tBeam: { value: beam.texture },
      uHull: { value: new THREE.Vector4(HULL.stern, HULL.shoulder, beam.stem, HULL.beam / 2) },
      uDeep: { value: new THREE.Color(palette.deep) },
      uSurface: { value: new THREE.Color(palette.surface) },
      uHorizon: { value: new THREE.Color(palette.horizon) },
      uZenith: { value: new THREE.Color(palette.zenith) },
      uMoonDir: { value: moonDir.clone().normalize() },
      uMoonColor: { value: new THREE.Color(palette.moon) },
      uFoam: { value: new THREE.Color(palette.foam) },
      uFogColor: { value: fogColor },
      uFogDensity: { value: fogDensity },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  const u = material.uniforms
  return {
    mesh,
    /** Hand the ocean a planar reflection (texture and its projection), or null to fall back to the sky colour. */
    setReflection(texture: THREE.Texture | null, matrix?: THREE.Matrix4) {
      u.tReflection.value = texture
      u.uReflect.value = texture ? 1 : 0
      if (matrix) u.uTextureMatrix.value = matrix
    },
    update(time: number, flow: number, speed: number) {
      u.uTime.value = time
      u.uFlow.value = flow
      u.uSpeed.value = speed
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      beam.texture.dispose()
    },
  }
}
