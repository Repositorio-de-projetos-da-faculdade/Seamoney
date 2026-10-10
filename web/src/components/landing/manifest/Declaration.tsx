'use client'

import { useRef, type ReactNode } from 'react'
import { EASE, useScrollScene } from '@/components/landing/motion'

/** Motion wrapper for the declaration: rules draw in, rows rise in turn. Reduced motion keeps the final layout. */
export function Declaration({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollScene(ref, ({ gsap, reduced }) => {
    if (reduced) return
    const trigger = { trigger: ref.current, start: 'top 75%' }
    gsap.fromTo('[data-rule]', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: EASE, stagger: 0.12, scrollTrigger: trigger })
    gsap.fromTo('[data-row]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: 0.05, scrollTrigger: trigger })
  })

  return <div ref={ref}>{children}</div>
}
