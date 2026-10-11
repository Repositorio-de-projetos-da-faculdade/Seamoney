'use client'

import clsx from 'clsx'
import { useId } from 'react'
import { useT } from '@/lib/i18n/client'
import { MEMO_SIZE, type Memo } from '@/lib/memo'
import { Reveal } from '../Reveal'
import { Lede } from '../lede/Lede'
import { ChapterTag, displayL } from '../type'
import { ByteStrip } from './cargo/ByteStrip'
import { Readout } from './cargo/Readout'
import { ReissueButton } from './cargo/ReissueButton'

interface Props {
  memo: Memo
  /** Memo containers already on deck (scroll-driven), 0 to 32. */
  landed: number
  onReissue: () => void
}

/**
 * Chapter 01, over the top-down shot of the deck. Above the ship: the title, the explanation and the reference
 * spelled out as its bytes land. Below it: the 32-byte strip and, once the cargo is loaded, a button that issues
 * another order code. The ship itself is left to the 3D and its HUD brackets.
 */
export function CargoCopy({ memo, landed, onReissue }: Props) {
  const { t } = useT()
  const countId = useId()
  const ready = landed >= MEMO_SIZE
  const shown = Math.min(landed, memo.used)

  return (
    <div className="pointer-events-none flex h-full flex-col justify-between px-5 pb-6 pt-24 md:px-10 md:pb-8 md:pt-28 lg:pl-24">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] md:items-start md:gap-12">
        <div>
          <ChapterTag n={1} name={t('lp.ch.1')} className="text-foam/60" />
          <Reveal text={t('lp.cargo.title')} className={clsx(displayL, 'mt-5 text-white')} />
        </div>
        <div className="space-y-5 md:space-y-7 md:pt-10">
          <Lede size="md" text={t('lp.cargo.body')} />
          <Readout memo={memo} shown={shown} ready={ready} countId={countId} />
        </div>
      </div>

      <div>
        <ReissueButton ready={ready} describedBy={countId} onReissue={onReissue} />
        <div className="mt-5">
          <ByteStrip memo={memo} landed={landed} />
        </div>
        <p
          className={clsx(
            'mt-3 max-w-[60ch] font-text text-[13px] leading-relaxed text-foam/50 transition-opacity duration-700',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          {t('lp.cargo.public')}
        </p>
      </div>
    </div>
  )
}
