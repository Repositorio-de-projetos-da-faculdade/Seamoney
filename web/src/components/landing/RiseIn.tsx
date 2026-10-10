'use client'

import clsx from 'clsx'
import { useRef, type ReactNode } from 'react'
import { useScrollScene } from './motion'

/** Content that surfaces from behind its own edge as it scrolls up into view (the footer wordmark). */
export function RiseIn({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollScene(ref, ({ gsap, reduced }) => {
    const el = ref.current
    if (!el || reduced) return
    gsap.fromTo(
      el.firstElementChild,
      { yPercent: 70 },
      { yPercent: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } },
    )
  })

  return (
    <div ref={ref} className={clsx('overflow-hidden', className)}>
      <div>{children}</div>
    </div>
  )
}
