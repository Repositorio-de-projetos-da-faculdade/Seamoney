'use client'

import clsx from 'clsx'
import { useRef } from 'react'
import { useT } from '@/lib/i18n/client'
import { useScrollScene } from '../motion'
import { Reveal } from '../Reveal'
import { ChapterTag, displayL, label } from '../type'
import { CheckMeter } from './speed/CheckMeter'
import { LedgerColumn } from './speed/LedgerColumn'
import { RangeMeter } from './speed/RangeMeter'
import { LENGTH } from './useVoyage'

/**
 * Chapter 02, over the water-level shot of the ship. A three-column ledger under the hull: as the visitor scrolls,
 * each bank-wire figure is struck through while the Seamoney figure rises into its place, and a meter draws the
 * gap. Estimates, labelled so; the meters plot the same ranges the copy states (1–5 days, 2–5% against 1%).
 */
export function SpeedChapter() {
  const { t } = useT()
  const ref = useRef<HTMLElement>(null)
  const bankName = t('lp.speed.bank')
  const seaName = t('lp.speed.sea')

  useScrollScene(ref, ({ gsap, reduced }) => {
    if (reduced) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 20%', end: 'bottom bottom', scrub: 0.8 } })
    gsap.utils.toArray<HTMLElement>('[data-col]').forEach((col, i) => {
      const at = i * 1.1
      const q = (sel: string) => col.querySelectorAll(sel)
      tl.fromTo(q('[data-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, at)
        .fromTo(q('[data-in]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, at + 0.1)
        .fromTo(q('[data-bank]'), { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power1.inOut' }, at + 0.25)
        .fromTo(q('[data-strike]'), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.in' }, at + 0.45)
        .to(q('[data-old]'), { opacity: 0.45, duration: 0.3 }, at + 0.7)
        .fromTo(q('[data-new]'), { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: 'expo.out' }, at + 0.7)
        .fromTo(q('[data-sea]'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.3, ease: 'expo.out' }, at + 0.8)
        .fromTo(q('[data-check]'), { opacity: 0.12 }, { opacity: 1, duration: 0.08, stagger: 0.07 }, at + 0.8)
    })
    tl.to({}, { duration: 0.6 })
  })

  return (
    <section ref={ref} id="speed" data-chapter="speed" className="relative z-10" style={{ height: `${LENGTH.speed}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden px-5 pb-8 pt-24 md:px-10 md:pb-10 md:pt-28 lg:pl-24">
        {/* the ledger sits on darker water, so the figures carry more than the ship behind them */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(0deg,rgb(2_8_16/0.92),rgb(2_8_16/0.7)_45%,transparent)]" aria-hidden="true" />

        <div className="relative">
          <ChapterTag n={2} name={t('lp.ch.2')} className="text-foam/60" />
          <Reveal text={t('lp.speed.title')} className={clsx(displayL, 'mt-5 text-white')} />
        </div>

        <div className="relative">
          <p className={clsx(label, 'mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-foam/60')}>
            <span className="flex items-center gap-2 text-bank-soft">
              <span className="h-2 w-5 bg-[repeating-linear-gradient(-45deg,rgb(64_136_184/0.85)_0_2px,transparent_2px_5px)] ring-1 ring-inset ring-bank/60" aria-hidden="true" />
              {bankName}
            </span>
            <span className="flex items-center gap-2 text-mint">
              <span className="h-2 w-5 bg-mint" aria-hidden="true" />
              {seaName}
            </span>
          </p>
          <ul className="grid md:grid-cols-[1fr_1fr_1.3fr]">
            <LedgerColumn n={1} bankName={bankName} seaName={seaName} figure={{ name: t('lp.speed.time'), bank: t('lp.speed.time.bank'), sea: t('lp.speed.time.sea') }}>
              <RangeMeter axis={['0', t('lp.speed.axis.time')]} bank={[0.2, 1]} sea={0} />
            </LedgerColumn>
            <LedgerColumn n={2} bankName={bankName} seaName={seaName} figure={{ name: t('lp.speed.fee'), bank: t('lp.speed.fee.bank'), sea: t('lp.speed.fee.sea') }}>
              <RangeMeter axis={['0%', '5%']} bank={[0.4, 1]} sea={0.2} />
            </LedgerColumn>
            <LedgerColumn n={3} bankName={bankName} seaName={seaName} figure={{ name: t('lp.speed.recon'), bank: t('lp.speed.recon.bank'), sea: t('lp.speed.recon.sea') }}>
              <CheckMeter />
            </LedgerColumn>
          </ul>
          <p className="mt-2 flex items-center gap-2.5 border-t border-foam/15 pt-4 font-text text-[14px] text-foam/60">
            <span className="size-2 shrink-0 rotate-45 bg-signal" aria-hidden="true" />
            {t('lp.speed.note')}
          </p>
        </div>
      </div>
    </section>
  )
}
