'use client'

import clsx from 'clsx'
import { useRef } from 'react'
import { useT } from '@/lib/i18n/client'
import { useScrollScene } from '../motion'
import { Reveal } from '../Reveal'
import { ChapterTag, displayL, label } from '../type'
import { LENGTH } from './useVoyage'

/**
 * Chapter 02, over the water-level shot of the ship. A three-column ledger under the hull: as the visitor scrolls,
 * each bank-wire figure is struck through and fades back while the Seamoney figure rises into its place.
 * Estimates, labelled so.
 */
export function SpeedChapter() {
  const { t } = useT()
  const ref = useRef<HTMLElement>(null)
  const columns = [
    { name: t('lp.speed.time'), bank: t('lp.speed.time.bank'), sea: t('lp.speed.time.sea') },
    { name: t('lp.speed.fee'), bank: t('lp.speed.fee.bank'), sea: t('lp.speed.fee.sea') },
    { name: t('lp.speed.recon'), bank: t('lp.speed.recon.bank'), sea: t('lp.speed.recon.sea') },
  ]

  useScrollScene(ref, ({ gsap, reduced }) => {
    if (reduced) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 20%', end: 'bottom bottom', scrub: 0.8 } })
    gsap.utils.toArray<HTMLElement>('[data-col]').forEach((col, i) => {
      const at = i * 1.1
      tl.fromTo(col.querySelector('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, at)
        .fromTo(col.querySelectorAll('[data-in]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, at + 0.1)
        .fromTo(col.querySelector('[data-strike]'), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.in' }, at + 0.45)
        .to(col.querySelector('[data-old]'), { opacity: 0.4, duration: 0.3 }, at + 0.7)
        .fromTo(col.querySelector('[data-new]'), { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: 'expo.out' }, at + 0.7)
    })
    tl.to({}, { duration: 0.6 })
  })

  return (
    <section ref={ref} id="speed" data-chapter="speed" className="relative z-10" style={{ height: `${LENGTH.speed}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden px-5 pb-8 pt-24 md:px-10 md:pb-10 md:pt-28 lg:pl-24">
        <div>
          <ChapterTag n={2} name={t('lp.ch.2')} className="text-foam/60" />
          <Reveal text={t('lp.speed.title')} className={clsx(displayL, 'mt-5 text-white')} />
        </div>

        <div>
          <p className={clsx(label, 'mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-foam/55')}>
            <span className="flex items-center gap-2">
              <span className="h-px w-5 bg-foam/60" aria-hidden="true" />
              {t('lp.speed.bank')}
            </span>
            <span className="flex items-center gap-2 text-mint">
              <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
              {t('lp.speed.sea')}
            </span>
          </p>
          <ul className="grid md:grid-cols-3">
            {columns.map((c, i) => (
              <li key={c.name} data-col className={clsx('relative py-4 md:py-5', i > 0 && 'md:pl-8', i < 2 && 'md:pr-8')}>
                <span data-rule className="absolute inset-x-0 top-0 h-px origin-left bg-foam/20" aria-hidden="true" />
                <p data-in className={clsx(label, 'text-foam/50')}>{c.name}</p>
                <p data-in className="mt-3">
                  <span className="sr-only">{t('lp.speed.bank')}: </span>
                  <span data-old className="relative inline-block font-grotesk text-[1.05rem] font-light tracking-[-0.01em] text-foam/80 md:text-[1.2rem]">
                    {c.bank}
                    <span data-strike className="absolute inset-x-0 top-[55%] block h-px origin-left bg-foam" aria-hidden="true" />
                  </span>
                </p>
                <p className="mt-1 overflow-hidden pb-[0.1em]">
                  <span className="sr-only">{t('lp.speed.sea')}: </span>
                  <span data-new className="block font-grotesk text-[clamp(2rem,3.4vw,3.4rem)] leading-[1.02] tracking-[-0.04em] text-white">
                    {c.sea}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-2.5 border-t border-foam/15 pt-4 font-text text-[13px] text-foam/55">
            <span className="size-2 shrink-0 rotate-45 bg-signal" aria-hidden="true" />
            {t('lp.speed.note')}
          </p>
        </div>
      </div>
    </section>
  )
}
