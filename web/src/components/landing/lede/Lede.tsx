'use client'

import clsx from 'clsx'
import { Fragment, useRef, type CSSProperties } from 'react'
import { revealed, REVEAL_EVENT, useScrollScene } from '../motion'
import { lede, ledeSize } from '../type'
import { GLYPHS } from './glyphs'
import { buildReading, pauseLoops } from './motion'
import { bindGlyphs, parseLede, type Piece } from './parse'

interface Props {
  text: string
  /** 'load': read out when the loader lifts (the opening); 'scroll': read along as the chapter scrolls in. */
  on?: 'load' | 'scroll'
  tone?: 'night' | 'paper'
  size?: keyof typeof ledeSize
  className?: string
}

/**
 * The running copy of a chapter, set as a spoken line rather than a grey paragraph: Funnel Display at the size of a
 * subhead, the *starred* words in the aqua italic of the titles, and the things it names drawn inline ({memo},
 * {route}...). The words come up out of the dark as the visitor reads along. Rendered in full without JavaScript.
 */
export function Lede(props: Props) {
  // GSAP rewrites the chip text, so new copy (a language switch) mounts a fresh element
  return <Line key={props.text} {...props} />
}

function Line({ text, on = 'scroll', tone = 'night', size = 'lg', className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)

  useScrollScene(ref, ({ gsap, reduced }) => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      gsap.set(el.querySelectorAll('[data-travel]'), { opacity: 1 })
      pauseLoops(el, true)
      return
    }
    if (on === 'load') {
      const tl = buildReading(gsap, el, gsap.timeline({ paused: true, delay: 0.9 }))
      const play = () => tl.play()
      if (revealed()) play()
      else window.addEventListener(REVEAL_EVENT, play, { once: true })
      return () => window.removeEventListener(REVEAL_EVENT, play)
    }
    // read along over the first stretch of the chapter (sticky chapters pin right after it)
    const trigger = el.closest('section') ?? el
    buildReading(gsap, el, gsap.timeline({ scrollTrigger: { trigger, start: 'top 80%', end: 'top 5%', scrub: 0.5 } }))
  })

  return (
    <p
      ref={ref}
      className={clsx(lede, ledeSize[size], 'lp-display', tone === 'paper' ? 'text-ink/85' : 'text-foam/90', className)}
      style={{ '--lede-accent': tone === 'paper' ? 'var(--color-brand-600)' : 'var(--color-mint)' } as CSSProperties}
    >
      {bindGlyphs(parseLede(text)).map((unit, i) =>
        unit.type === 'bound' ? (
          <span key={i} className="whitespace-nowrap">
            {unit.pieces.map(render)}
          </span>
        ) : (
          render(unit, i)
        ),
      )}
    </p>
  )
}

function render(piece: Piece, i: number) {
  if (piece.type === 'space') return ' '
  if (piece.type === 'glyph') return <Fragment key={i}>{GLYPHS[piece.name] ?? null}</Fragment>
  const word = (
    <span data-w className="inline-block">
      {piece.text}
    </span>
  )
  return piece.em ? <em key={i}>{word}</em> : <Fragment key={i}>{word}</Fragment>
}
