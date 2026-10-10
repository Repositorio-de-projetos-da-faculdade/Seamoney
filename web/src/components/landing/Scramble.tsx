'use client'

import { useRef } from 'react'
import { useScrollScene } from './motion'

const HEX = '0123456789ABCDEF'

/**
 * A short mono label that decodes itself, hex digit by hex digit, the first time its chapter comes into view.
 * Screen readers get the plain text; the scrambling copy is hidden from them.
 */
export function Scramble({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {/* GSAP rewrites the text node, so new copy (a language switch) mounts a fresh one */}
      <Decode key={text} text={text} />
    </span>
  )
}

function Decode({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useScrollScene(ref, ({ gsap, reduced }) => {
    const el = ref.current
    if (!el || reduced) return
    gsap.to(el, {
      duration: Math.min(1.6, 0.5 + text.length * 0.03),
      ease: 'none',
      scrambleText: { text, chars: HEX, speed: 0.7, revealDelay: 0.2 },
      scrollTrigger: { trigger: el.closest('section') ?? el, start: 'top 75%', once: true },
    })
  })

  return (
    <span ref={ref} aria-hidden="true">
      {text}
    </span>
  )
}
