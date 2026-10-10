'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import type { Memo } from '@/lib/memo'
import { label } from '../../type'

/**
 * The reference spelled out as its bytes land: each character comes into focus as its container touches the deck.
 * Below it, how many of the 32 bytes it uses (announced politely to screen readers).
 */
export function Readout({ memo, shown, ready, countId }: { memo: Memo; shown: number; ready: boolean; countId: string }) {
  const { t } = useT()
  return (
    <div>
      {/* phones already read the bytes off the containers and the strip: only the count is kept */}
      <p className="font-grotesk text-[clamp(1.9rem,2.9vw,3rem)] font-light leading-none tracking-[-0.04em] text-mint max-md:hidden" aria-hidden="true">
        {memo.bytes.map((b, i) =>
          b.char === null ? null : (
            <span
              key={`${i}-${b.hex}`}
              className="inline-block transition-[opacity,filter,translate] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]"
              style={shown > i ? undefined : { opacity: 0.12, filter: 'blur(6px)', translate: '0 -0.15em' }}
            >
              {b.char === ' ' ? ' ' : b.char}
            </span>
          ),
        )}
      </p>
      <p id={countId} className={clsx(label, 'md:mt-3', memo.fits ? 'text-foam/60' : 'text-signal')} aria-live="polite">
        {t(memo.fits ? 'lp.cargo.bytes' : 'lp.cargo.over', { n: ready ? memo.used : shown })}
      </p>
    </div>
  )
}
