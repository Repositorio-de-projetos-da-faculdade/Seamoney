'use client'

import { useRef, type ReactNode } from 'react'
import { EASE, useScrollScene } from '@/components/landing/motion'

/**
 * Motion wrapper for the declaration: rules draw in and lines rise in turn, each leader runs out to its stamp and the
 * stamp lands with a thump. Every group is triggered as it comes into view. Reduced motion keeps the final layout.
 */
export function Declaration({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollScene(ref, ({ gsap, reduced }) => {
    if (reduced) return
    gsap.utils.toArray<HTMLElement>('[data-rule]').forEach((rule) => {
      gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: EASE, scrollTrigger: { trigger: rule, start: 'top 85%' } })
    })
    gsap.utils.toArray<HTMLElement>('[data-row]').forEach((row) => {
      const trigger = { trigger: row, start: 'top 88%' }
      gsap.fromTo(row, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: EASE, scrollTrigger: trigger })
      const leader = row.querySelector('[data-leader]')
      if (leader) gsap.fromTo(leader, { scaleX: 0 }, { scaleX: 1, duration: 0.9, delay: 0.15, ease: 'power3.out', scrollTrigger: trigger })
      const stamp = row.querySelector('[data-stamp]')
      if (stamp) gsap.fromTo(stamp, { opacity: 0, scale: 1.8, rotation: -12 }, { opacity: 1, scale: 1, rotation: -3, duration: 0.45, delay: 0.55, ease: 'back.out(2.2)', scrollTrigger: trigger })
    })
  })

  return <div ref={ref}>{children}</div>
}
