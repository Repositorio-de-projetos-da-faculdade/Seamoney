'use client'

import clsx from 'clsx'
import { useT } from '@/lib/i18n/client'
import { label } from '../../type'

/**
 * Once the cargo is loaded: draws a fresh order code and loads it into the 3D containers. Every order gets its own
 * opaque code, so the visitor sees the memo change while the invoice behind it never goes on-chain.
 */
export function ReissueButton({ ready, describedBy, onReissue }: { ready: boolean; describedBy: string; onReissue: () => void }) {
  const { t } = useT()
  return (
    <div
      className={clsx(
        'w-full max-w-[24rem] transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]',
        ready ? 'pointer-events-auto opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onReissue}
        aria-describedby={describedBy}
        tabIndex={ready ? 0 : -1}
        className={clsx(
          label,
          'group inline-flex items-center gap-3 border-b border-foam/30 pb-2 text-foam/80 transition-colors hover:border-mint hover:text-white focus-visible:border-mint focus-visible:text-white focus-visible:outline-none',
        )}
      >
        <span aria-hidden="true" className="size-[0.6em] rotate-45 bg-mint transition-transform duration-500 group-hover:rotate-[225deg]" />
        {t('lp.cargo.try')}
      </button>
    </div>
  )
}
