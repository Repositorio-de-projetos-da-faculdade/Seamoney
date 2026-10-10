'use client'

import { useRef, type ElementType } from 'react'
import { EASE, revealed, REVEAL_EVENT, useScrollScene } from './motion'
import { Rich } from './type'

interface Props {
  text: string
  as?: ElementType
  /** 'load': when the loader lifts (the opening); 'scroll': when the chapter comes into view. */
  on?: 'load' | 'scroll'
  /** ScrollTrigger start, measured on the enclosing section. */
  start?: string
  className?: string
  id?: string
}

/**
 * A headline whose lines rise out of their own masks, one after the other. The text is rendered on the server and
 * reads fine without JavaScript; SplitText splits it on the client and splits again when the fonts load or the
 * width changes. Once a headline has been revealed, a new split leaves the lines in place.
 */
export function Reveal(props: Props) {
  // SplitText rewrites the element's children, so React must not patch them: new copy (a language switch) mounts
  // a fresh element, which splits and rises again.
  return <SplitHeadline key={props.text} {...props} />
}

function SplitHeadline({ text, as: Tag = 'h2', on = 'scroll', start = 'top 72%', className, id }: Props) {
  const ref = useRef<HTMLElement>(null)

  useScrollScene(ref, ({ gsap, SplitText, reduced }) => {
    const el = ref.current
    if (!el || reduced) return
    let done = false
    let current: gsap.core.Tween | null = null
    // headlines inside sticky stages: measure against their section, which scrolls normally
    const trigger = el.closest('section') ?? el

    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'lp-line',
      autoSplit: true,
      onSplit(self) {
        if (done) return
        current = gsap.from(self.lines, {
          yPercent: 120,
          rotate: 3,
          transformOrigin: '0% 100%',
          duration: 1.35,
          ease: EASE,
          stagger: 0.09,
          paused: on === 'load' && !revealed(),
          delay: on === 'load' ? 0.15 : 0,
          onComplete: () => void (done = true),
          scrollTrigger: on === 'scroll' ? { trigger, start, once: true } : undefined,
        })
        return current
      },
    })

    const play = () => current?.play()
    if (on === 'load') window.addEventListener(REVEAL_EVENT, play)
    return () => {
      window.removeEventListener(REVEAL_EVENT, play)
      split.revert()
    }
  })

  return (
    <Tag ref={ref} id={id} className={className}>
      <Rich text={text} />
    </Tag>
  )
}
