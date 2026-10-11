import * as THREE from 'three'
import { noiseChunk } from './noise'

// The night sky dome: navy to black with a teal glow on the horizon, drifting clouds with moonlit edges, the moon
// and its halo, stars, and the world on the horizon line: the lights of the port the ship left (Santos, astern),
// a lighthouse flashing on the coast and a few other ships far away. The dome follows the camera and writes no depth.
// Cloud noise comes from the baked texture (noise.ts).

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uGlow;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  ${noiseChunk}
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
    return v;
  }

  // a point light on the horizon at azimuth az (radians), height h above it
  float beacon(vec3 d, float az, float h, float size) {
    vec3 at = normalize(vec3(cos(az), h, sin(az)));
    return smoothstep(1.0 - size, 1.0, dot(d, at));
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.62, h), 0.65));
    col += uGlow * exp(-h * 10.0) * 0.55;

    vec3 moonDir = normalize(uMoonDir);
    float m = max(dot(d, moonDir), 0.0);

    // stars, fading towards the horizon
    vec3 cell = floor(d * 300.0);
    float r = hash(cell);
    float dotShape = smoothstep(0.24, 0.0, length(fract(d * 300.0) - 0.5));
    float star = step(0.9965, r) * dotShape * smoothstep(0.05, 0.35, h) * 2.0;
    float tw = 0.6 + 0.4 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);

    // clouds: a layer on a plane above, drifting slowly, lit on the side facing the moon
    vec2 cp = d.xz / max(d.y + 0.08, 0.02) * 0.9 + vec2(uTime * 0.006, uTime * 0.002);
    float cloud = smoothstep(0.48, 0.82, fbm(cp * 0.9));
    cloud *= smoothstep(0.02, 0.18, h) * (1.0 - smoothstep(0.55, 0.9, h));
    float lit = pow(m, 6.0);
    vec3 cloudCol = mix(vec3(0.02, 0.05, 0.08), uMoonColor * 0.32, lit * 0.9 + 0.08);
    col += vec3(0.85, 0.92, 1.0) * star * tw * (0.5 + hash(cell + 1.0)) * (1.0 - cloud);
    col = mix(col, cloudCol, cloud * 0.85);

    // the moon: a disc with faint maria, its corona and a wide halo
    float disc = smoothstep(0.99935, 0.99955, m);
    if (disc > 0.0) {
      vec2 mp = (d - moonDir).xy * 900.0;
      col += uMoonColor * disc * 3.4 * (0.82 + 0.18 * fbm(mp * 0.25)) * (1.0 - cloud * 0.7);
    }
    col += uMoonColor * (pow(m, 500.0) * 0.3 + pow(m, 70.0) * 0.018);

    // on the horizon: the port astern, a lighthouse, a few ships
    if (abs(d.y) < 0.03) {
      float az = atan(d.z, d.x);
      // Santos, astern: a long band of sodium and white lights
      float band = smoothstep(0.55, 0.0, abs(az - 3.02)) * smoothstep(0.012, 0.0, abs(d.y - 0.004));
      vec2 lp = vec2(az * 520.0, d.y * 900.0);
      float lights = step(0.86, hash2(floor(lp))) * smoothstep(0.45, 0.0, length(fract(lp) - 0.5));
      vec3 sodium = mix(vec3(1.0, 0.62, 0.28), vec3(0.85, 0.92, 1.0), step(0.7, hash2(floor(lp) + 7.0)));
      col += sodium * lights * band * 1.6;
      col += vec3(1.0, 0.55, 0.25) * band * 0.035;
      // lighthouse on the coast: a flash every few seconds
      float flash = pow(max(sin(uTime * 1.1), 0.0), 18.0);
      col += vec3(1.0, 0.95, 0.8) * beacon(d, 2.55, 0.006, 0.0000035) * (0.4 + 3.0 * flash);
      // other ships far away: a white masthead light over a red or green side light
      col += vec3(1.0) * beacon(d, 0.35, 0.007, 0.0000018) * 1.4;
      col += vec3(1.0, 0.2, 0.15) * beacon(d, 0.352, 0.0045, 0.0000014) * 1.2;
      col += vec3(1.0) * beacon(d, -0.9, 0.006, 0.0000014) * 1.1;
      col += vec3(0.2, 1.0, 0.5) * beacon(d, -0.898, 0.004, 0.0000012) * 1.0;
      col += vec3(1.0) * beacon(d, 1.35, 0.005, 0.0000012) * 0.9;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

export function createSky(colors: { horizon: string; zenith: string; glow: string; moon: string }, moonDir: THREE.Vector3, noise: THREE.Texture) {
  const geometry = new THREE.SphereGeometry(15000, 64, 32)
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uHorizon: { value: new THREE.Color(colors.horizon) },
      uZenith: { value: new THREE.Color(colors.zenith) },
      uGlow: { value: new THREE.Color(colors.glow) },
      uMoonDir: { value: moonDir.clone().normalize() },
      uMoonColor: { value: new THREE.Color(colors.moon) },
      uTime: { value: 0 },
      tNoise: { value: noise },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -1
  return {
    mesh,
    material,
    update(time: number, camera: THREE.Camera) {
      material.uniforms.uTime.value = time
      mesh.position.copy(camera.position)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
