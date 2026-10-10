import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// Post-processing, in this order: the scene, bloom on the lights, tone mapping (OutputPass), then a grade in display
// space: split toning (teal shadows, sodium highlights), a gentle S curve, a lens vignette, a touch of chromatic
// aberration at the edges and fine animated grain.

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uAberration: { value: 0.0006 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 shift = c * r2 * uAberration * 18.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + shift).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - shift).b);

      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadows = vec3(0.0, 0.035, 0.05);
      vec3 highlights = vec3(0.06, 0.02, -0.03);
      col += shadows * (1.0 - smoothstep(0.0, 0.45, luma)) + highlights * smoothstep(0.45, 1.0, luma);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);

      col *= 1.0 - uVignette * smoothstep(0.1, 0.75, r2 * 2.2);
      col += (hash(vUv * 900.0 + fract(uTime) * 17.0) - 0.5) * 0.028;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, bloomOn: boolean) {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.93)
  if (bloomOn) composer.addPass(bloom)
  composer.addPass(new OutputPass())
  const grade = new ShaderPass(GradeShader)
  composer.addPass(grade)
  return {
    composer,
    setSize(w: number, h: number) {
      composer.setSize(w, h)
      bloom.resolution.set(w / 2, h / 2)
    },
    render(time: number) {
      grade.uniforms.uTime.value = time
      composer.render()
    },
    dispose() {
      composer.dispose()
    },
  }
}
