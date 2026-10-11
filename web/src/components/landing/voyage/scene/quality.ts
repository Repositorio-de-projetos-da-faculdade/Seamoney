import type { ShipQuality } from './ship'

// How much of the scene a device gets. The window width says little about the GPU behind it: a 13-inch Android
// tablet is as wide as a laptop and has a phone's GPU. So the tier comes from the screen, the input (touch first),
// the GPU's name when the browser gives it, and memory and cores. The governor (governor.ts) then trims further on
// any device that still cannot keep up. `?quality=low|medium|high` forces a tier, for testing on a device.

export type Tier = 'low' | 'medium' | 'high'

export interface Profile {
  tier: Tier
  ship: ShipQuality
  /** Device pixels per CSS pixel: where it starts, and how far down the governor may take it. */
  pixelRatio: { max: number; min: number }
  shadowSize: number
  /** Rendered frames between shadow map updates while nothing on board moves (the moon never does). */
  shadowEvery: number
  /** Planar reflection resolution relative to the screen, 0 for none (the water then reflects the sky colour). */
  reflection: number
  bloom: boolean
  oceanRings: number
}

const PROFILES: Record<Tier, Omit<Profile, 'tier'>> = {
  high: { ship: 'high', pixelRatio: { max: 1.75, min: 1 }, shadowSize: 4096, shadowEvery: 2, reflection: 0.5, bloom: true, oceanRings: 190 },
  medium: { ship: 'high', pixelRatio: { max: 1.25, min: 0.85 }, shadowSize: 2048, shadowEvery: 3, reflection: 0.35, bloom: true, oceanRings: 150 },
  low: { ship: 'low', pixelRatio: { max: 1.4, min: 0.85 }, shadowSize: 1024, shadowEvery: 3, reflection: 0, bloom: true, oceanRings: 120 },
}

const MOBILE_GPU = /mali|adreno|xclipse|powervr|immortalis|videocore|tegra/i

function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  } catch {
    return ''
  }
}

function forced(): Tier | null {
  const q = new URLSearchParams(window.location.search).get('quality')
  return q === 'low' || q === 'medium' || q === 'high' ? q : null
}

export function detectTier(gl: WebGLRenderingContext | WebGL2RenderingContext): Tier {
  const force = forced()
  if (force) return force
  if (window.matchMedia('(max-width: 767px)').matches) return 'low'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const touch = window.matchMedia('(pointer: coarse)').matches
  const weak = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4
  return touch || weak || MOBILE_GPU.test(gpuName(gl)) ? 'medium' : 'high'
}

export function profileFor(tier: Tier): Profile {
  return { tier, ...PROFILES[tier] }
}
