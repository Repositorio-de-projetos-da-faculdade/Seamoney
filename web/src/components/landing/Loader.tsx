'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { encodeMemo, MEMO_SIZE } from '@/lib/memo'
import { LogoMark } from '../ui'
import { prefersReducedMotion, REVEAL_EVENT } from './motion'
import { SAMPLE_REFERENCE as REFERENCE } from './sample'
import { label } from './type'
import { READY_EVENT } from './voyage/useVoyage'

const BYTES = encodeMemo(REFERENCE).bytes
const MIN_MS = 1500
const MAX_MS = 5000

/** Lifts the curtain: the opening reveals run on lp-revealed (CSS) and REVEAL_EVENT (GSAP). */
function reveal() {
  document.documentElement.classList.add('lp-revealed')
  window.dispatchEvent(new Event(REVEAL_EVENT))
}

/**
 * Opening curtain. The memo tier is drawn from above, eight boxes by four, and fills byte by byte while the 3D scene
 * loads; then the curtain lifts and the headline rises. Skipped for reduced motion.
 */
export function Loader() {
  const { t } = useT()
  const [filled, setFilled] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'lifting' | 'done'>('loading')
  const ready = useRef(false)

  useEffect(() => {
    let frame = 0
    if (prefersReducedMotion()) {
      reveal()
      frame = requestAnimationFrame(() => setPhase('done'))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const timers: number[] = []
    const onReady = () => (ready.current = true)
    window.addEventListener(READY_EVENT, onReady)
    const tick = () => {
      const elapsed = performance.now() - start
      // fill to 28 bytes on time alone, the last ones wait for the scene
      const target = ready.current && elapsed > MIN_MS ? MEMO_SIZE : Math.min(28, Math.floor((elapsed / MIN_MS) * 28))
      setFilled((f) => Math.max(f, target))
      if ((ready.current && elapsed > MIN_MS) || elapsed > MAX_MS) {
        setFilled(MEMO_SIZE)
        timers.push(
          window.setTimeout(() => {
            setPhase('lifting')
            reveal()
          }, 380),
          window.setTimeout(() => setPhase('done'), 1700),
        )
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
      window.removeEventListener(READY_EVENT, onReady)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className="lp-loader fixed inset-0 z-[70] flex flex-col justify-between bg-abyss px-5 py-6 text-foam transition-[clip-path] duration-[1300ms] ease-[cubic-bezier(0.87,0,0.13,1)] md:px-10 md:py-8"
      style={{ clipPath: phase === 'lifting' ? 'inset(0 0 100% 0)' : 'inset(0 0 0 0)' }}
      role="status"
      aria-label={t('lp.loader')}
    >
      <div className="flex items-center justify-between gap-6">
        <LogoMark size={26} />
        <p className={clsx(label, 'text-foam/55')}>{t('lp.loader')}</p>
      </div>

      {/* the memo tier from above: 32 roofs, the reference in mint, the zero padding in steel */}
      <ol className="mx-auto grid w-full max-w-[760px] grid-cols-8 gap-1.5 md:gap-2" aria-hidden="true">
        {BYTES.map((b, i) => {
          const on = i < filled
          return (
            <li
              key={i}
              className={clsx(
                'flex aspect-[2.48] flex-col justify-between border px-1.5 py-1 font-data transition-[background-color,border-color,color] duration-300 md:px-2 md:py-1.5',
                !on && 'border-foam/10 text-transparent',
                on && !b.padding && 'border-mint bg-mint text-abyss',
                on && b.padding && 'border-foam/25 text-foam/40',
              )}
            >
              <span className="text-[8px] opacity-60 md:text-[9px]">{String(i).padStart(2, '0')}</span>
              <span className="self-end text-[10px] font-semibold uppercase md:text-[12px]">{b.hex}</span>
            </li>
          )
        })}
      </ol>

      <div className="flex items-end justify-between gap-6">
        <p className={clsx(label, 'max-w-[26ch] text-foam/55')}>
          <span className="text-mint">{REFERENCE}</span> → 32 bytes · Tempo 42431
        </p>
        <p className="font-grotesk text-[clamp(4rem,13vw,11rem)] font-light leading-[0.8] tracking-[-0.05em] tabular-nums">
          {String(filled).padStart(2, '0')}
          <span className="text-foam/25">/32</span>
        </p>
      </div>
    </div>
  )
}
