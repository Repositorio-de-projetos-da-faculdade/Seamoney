'use client'

import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useEffect, type RefObject } from 'react'

// Shared motion setup for the landing page. Every scroll-driven chapter goes through useScrollScene, so GSAP is
// registered once, animations are scoped to their section and reverted on unmount, and reduced motion is honoured.

let registered = false

export function motion() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)
    // an animation over an empty selection animates nothing: do not fill the console with "target not found"
    gsap.config({ nullTargetWarn: false })
    registered = true
  }
  return { gsap, ScrollTrigger, SplitText }
}

/** The landing's signature curve: a long, soft landing (expo out). */
export const EASE = 'expo.out'

/** Fired once when the loader lifts; the opening reveals wait for it (see Loader.tsx). */
export const REVEAL_EVENT = 'seamoney:reveal'
export const revealed = () => typeof document !== 'undefined' && document.documentElement.classList.contains('lp-revealed')

/**
 * Reduced motion is honoured, except with `?motion=full` in the URL (sets `motion-full` on <html>): a demo switch
 * for machines where the OS animation setting is off, e.g. when recording the pitch video.
 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !document.documentElement.classList.contains('motion-full') &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface SceneTools {
  gsap: typeof gsap
  ScrollTrigger: typeof ScrollTrigger
  SplitText: typeof SplitText
  /** True when the visitor asked for reduced motion: show final states, skip scrubbing. */
  reduced: boolean
}

/** Runs `setup` inside a gsap.context scoped to `scope`, and reverts everything on unmount. */
export function useScrollScene(scope: RefObject<HTMLElement | null>, setup: (tools: SceneTools) => void | (() => void)) {
  useEffect(() => {
    const { gsap, ScrollTrigger, SplitText } = motion()
    let cleanup: void | (() => void)
    const ctx = gsap.context(() => {
      cleanup = setup({ gsap, ScrollTrigger, SplitText, reduced: prefersReducedMotion() })
    }, scope.current ?? undefined)
    return () => {
      cleanup?.()
      ctx.revert()
    }
    // setup is defined inline by callers and only meant to run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
