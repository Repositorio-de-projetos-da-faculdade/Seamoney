'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { useComparison, useLocalComparison } from '@/lib/useComparison'
import { Reveal } from './Reveal'
import { primaryCta, STATIC_SITE } from './site'
import { Lede } from './lede/Lede'
import { ChapterTag, displayL, label } from './type'
import { FeeInput } from './savings/FeeInput'
import { ResultPanel } from './savings/ResultPanel'
import { RouteTickets } from './savings/RouteTickets'
import { SavingsStage } from './savings/SavingsStage'
import { VolumeSlider } from './savings/VolumeSlider'

const DEFAULT_VOLUME = 80000
const DEFAULT_FEE = 3

// The static build has no rules API behind it, so it runs the browser copy of the same pricing math.
// STATIC_SITE is fixed at build time, so the hook never changes between renders.
const useSavings = STATIC_SITE ? useLocalComparison : useComparison

/**
 * Chapter 05: two tickets compare what each route loses on the way, then give way to the calculator, where the
 * visitor sets the volume and the bank fee and the Java rules API (or its browser copy) answers.
 */
export function Savings() {
  const { t, locale } = useT()

  // remounts on a language switch, since the scene writes the counting figures itself
  return (
    <SavingsStage
      key={locale}
      locale={locale}
      header={
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-end">
          <div>
            <ChapterTag n={5} name={t('lp.ch.5')} className="text-foam/60" />
            <Reveal text={t('lp.save.title')} className={clsx(displayL, 'mt-5 text-white')} />
          </div>
          <Lede size="md" text={t(STATIC_SITE ? 'lp.save.body.static' : 'lp.save.body')} className="md:pb-3" />
        </div>
      }
      tickets={<RouteTickets t={t} locale={locale} />}
      calculator={<Calculator />}
    />
  )
}

function Calculator() {
  const { t, locale } = useT()
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [fee, setFee] = useState(DEFAULT_FEE)
  const result = useSavings(volume, fee)

  return (
    <div className="grid gap-16 border-t border-foam/15 pt-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20 md:pt-16">
      <p className={clsx(label, 'text-mint md:col-span-2 md:-mb-8')}>{t('lp.save.yours')}</p>
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
          cta={primaryCta(t)}
        />
      )}
    </div>
  )
}
