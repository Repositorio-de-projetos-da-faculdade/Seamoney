'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { useComparison } from '@/lib/useComparison'
import { Reveal } from './Reveal'
import { ChapterTag, displayL, lede } from './type'
import { FeeInput } from './savings/FeeInput'
import { ResultPanel } from './savings/ResultPanel'
import { VolumeSlider } from './savings/VolumeSlider'

const DEFAULT_VOLUME = 80000
const DEFAULT_FEE = 3

/** Chapter 05: the visitor sets the volume and the bank fee; the Java rules API answers with the numbers. */
export function Savings() {
  const { t, locale } = useT()
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [fee, setFee] = useState(DEFAULT_FEE)
  const result = useComparison(volume, fee)

  return (
    <section id="savings" data-chapter="savings" className="relative z-10 bg-night px-5 py-28 text-foam md:px-10 md:py-40 lg:pl-24">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-end">
        <div>
          <ChapterTag n={5} name={t('lp.ch.5')} className="text-foam/60" />
          <Reveal text={t('lp.save.title')} className={clsx(displayL, 'mt-5 text-white')} />
        </div>
        <p className={clsx(lede, 'text-[1rem] md:pb-3 md:text-[1.06rem]')}>{t('lp.save.body')}</p>
      </div>

      <div className="mt-16 grid gap-16 border-t border-foam/15 pt-12 md:mt-20 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20 md:pt-16">
        <div className="space-y-14">
          <VolumeSlider id="savings-volume" label={t('calc.monthly')} value={volume} locale={locale} onChange={setVolume} />
          <FeeInput id="savings-fee" label={t('calc.bankFee')} hint={t('calc.bankFee.hint')} value={fee} locale={locale} onChange={setFee} />
        </div>

        {result && (
          <ResultPanel
            t={t}
            locale={locale}
            yearDollars={Math.round((result.savingsCents * 12) / 100)}
            savingsCents={result.savingsCents}
            bankCents={result.bankCents}
            routeCents={result.routeCents}
          />
        )}
      </div>
    </section>
  )
}
