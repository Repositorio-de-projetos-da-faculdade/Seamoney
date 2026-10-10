'use client'

import clsx from 'clsx'
import { useId } from 'react'
import { useT } from '@/lib/i18n/client'
import { label } from '../../type'

/** Once the cargo is loaded: a field to load your own invoice number into the 3D containers. */
export function MemoInput({ value, ready, describedBy, onChange }: { value: string; ready: boolean; describedBy: string; onChange: (value: string) => void }) {
  const { t } = useT()
  const id = useId()
  return (
    <div
      className={clsx(
        'w-full max-w-[24rem] transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]',
        ready ? 'pointer-events-auto opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <label htmlFor={id} className={clsx(label, 'text-foam/60')}>
        {t('lp.cargo.try')}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        tabIndex={ready ? 0 : -1}
        spellCheck={false}
        autoComplete="off"
        maxLength={64}
        className="mt-2 block w-full rounded-none border-0 border-b border-foam/30 bg-transparent pb-2 font-grotesk text-[1.75rem] font-light tracking-[-0.03em] text-white caret-mint transition-colors hover:border-foam/60 focus:border-mint focus-visible:outline-none"
      />
    </div>
  )
}
