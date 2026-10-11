import * as THREE from 'three'
import type { MemoByte } from '@/lib/memo'
import { createCargo } from './cargo'
import { createGovernor } from './governor'
import { FONTS } from './livery'
import { projectMemo, type ScreenRect } from './memoBounds'
import { createNoiseTexture } from './noise'
import { createOcean } from './ocean'
import { createPost } from './post'
import { detectTier, profileFor, type Profile } from './quality'
import { createReflection } from './reflection'
import type { Shot } from './shots'
import { createShip } from './ship'
import { createSky } from './sky'
import { createSmoke } from './smoke'

// The whole night scene: sky, ocean with reflections, the ship and its memo cargo, moonlight with shadows, an
// environment map made from the sky itself, smoke and post-processing. React only feeds it a camera shot, the
// load progress, the ship's speed and the memo bytes. It renders only while it is on screen, at most 60 times a
// second, at the detail the device can afford (quality.ts), trimmed further if frames run slow (governor.ts).

/** Faster screens (90, 120, 144 Hz) skip frames: the scene moves slowly and the GPU is spared. */
const FRAME_MS = 1000 / 60

const PALETTE = {
  deep: '#010811',
  surface: '#04203a',
  horizon: '#072235',
  zenith: '#00040a',
  glow: '#0e4a56',
  moon: '#e8f3ff',
  foam: '#cfe9f2',
}

export interface VoyageScene {
  setShot(shot: Shot): void
  setLoad(p: number): void
  setSpeed(s: number): void
  setBytes(bytes: MemoByte[]): void
  setActive(active: boolean): void
  /** Where the pointer is, -1 to 1 on both axes: the camera leans a little towards it. */
  setPointer(x: number, y: number): void
  /** Called every rendered frame with the memo tier's box on screen, or null to stop. */
  setOverlay(cb: ((memo: ScreenRect) => void) | null): void
  resize(): void
  dispose(): void
}

async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`800 190px ${FONTS.display}`), document.fonts.load(`700 64px ${FONTS.data}`)])
  } catch {
    // canvas falls back to system fonts
  }
}

export async function createVoyageScene(canvas: HTMLCanvasElement, bytes: MemoByte[], reduced: boolean): Promise<VoyageScene> {
  await fontsReady()
  // no antialias on the canvas: the scene is drawn into the post-processing targets, and the canvas only ever
  // receives the final full-screen pass, so multisampling it would cost memory and buy nothing
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  const profile: Profile = profileFor(detectTier(renderer.getContext()))
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatio.max))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  // redrawn on demand (see render): the moon never moves
  renderer.shadowMap.autoUpdate = false

  const scene = new THREE.Scene()
  // the water, the standard materials and the sky meet in one horizon colour
  const fogColor = new THREE.Color(PALETTE.horizon).add(new THREE.Color(PALETTE.glow).multiplyScalar(0.6))
  scene.fog = new THREE.FogExp2(fogColor, 0.0009)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 20000)

  const moonDir = new THREE.Vector3(1, 0.24, -0.5).normalize()
  const noise = createNoiseTexture()
  const sky = createSky({ horizon: PALETTE.horizon, zenith: PALETTE.zenith, glow: PALETTE.glow, moon: PALETTE.moon }, moonDir, noise)
  const ocean = createOcean(PALETTE, moonDir, profile.oceanRings, 0.00085, fogColor, noise)
  const ship = createShip(profile.ship)
  const cargo = createCargo(bytes)
  const smoke = createSmoke()
  const vessel = new THREE.Group()
  vessel.add(ship.group, cargo.group, smoke.points)
  scene.add(sky.mesh, ocean.mesh, vessel)

  // environment lighting made from the sky itself, so metal and glass reflect the same night
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.material))
  const env = pmrem.fromScene(envScene, 0.04, 0.1, 1000)
  scene.environment = env.texture
  scene.environmentIntensity = 0.55

  // moonlight with soft shadows over the whole ship, a cold fill and the sky
  const moon = new THREE.DirectionalLight('#c3d6ff', 1.35)
  moon.position.copy(moonDir).multiplyScalar(320)
  moon.castShadow = true
  moon.shadow.mapSize.setScalar(profile.shadowSize)
  Object.assign(moon.shadow.camera, { left: -130, right: 130, top: 80, bottom: -80, near: 10, far: 800 })
  moon.shadow.bias = -0.0004
  moon.shadow.normalBias = 0.6
  const fill = new THREE.DirectionalLight('#6f9cc8', 0.7)
  fill.position.set(60, 80, 220)
  scene.add(moon, moon.target, fill, new THREE.HemisphereLight('#2f5a7c', '#020a12', 0.5))

  let reflection = profile.reflection > 0 ? createReflection(profile.reflection) : null
  if (reflection) ocean.setReflection(reflection.texture, reflection.textureMatrix)
  const post = createPost(renderer, scene, camera, profile.bloom)
  const governor = createGovernor(trimSteps())

  const target = new THREE.Vector3()
  const pointer = new THREE.Vector2()
  const lean = new THREE.Vector2()
  const shot: Shot = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, ux: 0, uy: 1, uz: 0, fov: 36, sail: 0 }
  let speed = 0.35
  let flow = 0
  let active = true
  let frame = 0
  let overlay: ((memo: ScreenRect) => void) | null = null
  let last = 0
  let lastFrame = 0
  let lastRender = 0
  let owed = 0
  let shadowAge = Infinity
  let shadowSail = NaN
  const timer = new THREE.Timer()

  /**
   * What the governor may give up, in order: resolution down to 1x, then the reflection (a second render of the
   * whole scene), then resolution below 1x, then the bloom.
   */
  function trimSteps() {
    const ratio = (r: number) => () => {
      renderer.setPixelRatio(r)
      resize()
    }
    const sharp: (() => void)[] = []
    const soft: (() => void)[] = []
    const { min } = profile.pixelRatio
    for (let r = renderer.getPixelRatio() - 0.25; r > min - 0.1; r -= 0.25) {
      const next = Math.max(r, min)
      ;(next >= 1 ? sharp : soft).push(ratio(next))
    }
    const steps = [...sharp]
    if (reflection)
      steps.push(() => {
        reflection?.dispose()
        reflection = null
        ocean.setReflection(null)
      })
    steps.push(...soft)
    if (profile.bloom) steps.push(() => post.setBloom(false))
    return steps
  }

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    const ratio = renderer.getPixelRatio()
    post.setSize(w * ratio, h * ratio)
    reflection?.setSize(w * ratio, h * ratio)
    smoke.setScale(h * ratio)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function placeCamera(time: number) {
    // a slow handheld drift keeps the frame alive even when nobody scrolls
    const drift = reduced ? 0 : 1
    camera.position.set(shot.px + Math.sin(time * 0.13) * 2.2 * drift, shot.py + Math.sin(time * 0.21) * 0.9 * drift, shot.pz + Math.cos(time * 0.11) * 1.6 * drift)
    camera.up.set(shot.ux, shot.uy, shot.uz).normalize()
    target.set(shot.tx, shot.ty, shot.tz)
    camera.lookAt(target)
    // the camera leans towards the pointer, a few percent of its distance, and swings back to look at the target:
    // near and far things slide past each other
    lean.lerp(pointer, 0.05)
    const reach = camera.position.distanceTo(target) * 0.025
    camera.translateX(lean.x * reach)
    camera.translateY(lean.y * reach * 0.6)
    camera.lookAt(target)
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov
      camera.updateProjectionMatrix()
    }
  }

  function render() {
    timer.update()
    const time = reduced ? 4 : timer.getElapsed()
    const dt = Math.min(0.1, time - last)
    last = time
    // the water flows past a ship that holds still; in the finale the ship itself sails away
    flow += dt * (4 + 14 * speed)
    ocean.update(time, flow, speed)
    sky.update(time, camera)
    ship.update(time)
    cargo.update(time)
    smoke.update(time, speed)
    vessel.position.x = shot.sail
    vessel.position.y = Math.sin(time * 0.55) * 0.35
    vessel.rotation.x = Math.sin(time * 0.42) * 0.014
    vessel.rotation.z = Math.sin(time * 0.31 + 1) * 0.005
    placeCamera(time)
    overlay?.(projectMemo(vessel, camera, canvas.clientWidth, canvas.clientHeight))
    // not on the first frame: the shadow map does not exist yet, and the reflection must not be the pass that
    // draws it (it renders with a clipping plane)
    if (reflection && shadowAge !== Infinity) reflection.render(renderer, scene, camera, [ocean.mesh, smoke.points])
    // the shadow map is redrawn every few frames, and every frame while something on board moves (a box being
    // lowered, the ship sailing off)
    if (++shadowAge >= profile.shadowEvery || cargo.moving || shot.sail !== shadowSail) {
      renderer.shadowMap.needsUpdate = true
      shadowAge = 0
      shadowSail = shot.sail
    }
    post.render(time)
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop)
    if (!active) {
      lastFrame = 0
      return
    }
    owed += lastFrame ? now - lastFrame : FRAME_MS
    lastFrame = now
    if (owed < FRAME_MS - 2) return
    // keep the remainder, so a 90 Hz screen draws two frames out of three, but never a backlog
    owed = Math.max(0, Math.min(owed - FRAME_MS, FRAME_MS))
    if (lastRender) governor.frame(now - lastRender)
    lastRender = now
    render()
  }

  resize()
  frame = requestAnimationFrame(loop)

  const api: VoyageScene = {
    setShot(s) {
      Object.assign(shot, s)
      if (reduced) render()
    },
    setLoad(p) {
      cargo.setLoad(p)
    },
    setSpeed(s) {
      speed = s
    },
    setBytes(b) {
      cargo.setBytes(b)
    },
    setActive(a) {
      active = a
    },
    setPointer(x, y) {
      if (!reduced) pointer.set(x, y)
    },
    setOverlay(cb) {
      overlay = cb
    },
    resize,
    dispose() {
      cancelAnimationFrame(frame)
      timer.dispose()
      sky.dispose()
      ocean.dispose()
      ship.dispose()
      cargo.dispose()
      smoke.dispose()
      reflection?.dispose()
      noise.dispose()
      env.dispose()
      pmrem.dispose()
      post.dispose()
      renderer.dispose()
    },
  }
  // dev only: lets the camera be tuned from the browser console
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __voyage?: VoyageScene }).__voyage = api
  return api
}
