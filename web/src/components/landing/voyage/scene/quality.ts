import type { ShipQuality } from './ship'

// How much of the scene a device gets. Every device gets 'low': side by side, the team saw little difference from
// 'high' and a large one in speed. The governor (governor.ts) still trims further on any device that cannot keep
// up. `?quality=low|medium|high` picks another tier, to compare them on a device.

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

export function pickTier(): Tier {
  const q = new URLSearchParams(window.location.search).get('quality')
  return q === 'medium' || q === 'high' ? q : 'low'
}

export function profileFor(tier: Tier): Profile {
  return { tier, ...PROFILES[tier] }
}
