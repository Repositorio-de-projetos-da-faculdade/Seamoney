'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { motion, prefersReducedMotion } from './motion'

/** Inertial scrolling for the landing page, driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const { gsap, ScrollTrigger } = motion()
    const lenis = new Lenis({ duration: 1.15, anchors: { offset: -64 }, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])
  return null
}
