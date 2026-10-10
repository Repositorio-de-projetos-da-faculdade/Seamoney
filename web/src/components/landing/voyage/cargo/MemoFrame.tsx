import clsx from 'clsx'
import type { Ref } from 'react'
import { memoHex, type Memo } from '@/lib/memo'
import { label, mono } from '../../type'

const CORNER = 'absolute size-4 border-mint'
const TAG = 'absolute whitespace-nowrap bg-abyss/85 px-1.5 py-1 text-[10px]'

/**
 * HUD brackets around the 32 memo containers, placed every frame by the 3D scene (useVoyage) so they hold on to
 * the tier while the camera moves. Shown only while the camera looks down on the deck. Decorative.
 */
export function MemoFrame({ ref, memo }: { ref: Ref<HTMLDivElement>; memo: Memo }) {
  return (
    <div ref={ref} className="pointer-events-none invisible absolute left-0 top-0 opacity-0 will-change-transform" aria-hidden="true">
      <span className={clsx(CORNER, '-left-3 -top-3 border-l-[1.5px] border-t-[1.5px]')} />
      <span className={clsx(CORNER, '-right-3 -top-3 border-r-[1.5px] border-t-[1.5px]')} />
      <span className={clsx(CORNER, '-bottom-3 -left-3 border-b-[1.5px] border-l-[1.5px]')} />
      <span className={clsx(CORNER, '-bottom-3 -right-3 border-b-[1.5px] border-r-[1.5px]')} />
      <p className={clsx(label, TAG, '-left-3 -top-11 text-mint')}>Memo · bytes32</p>
      <p className={clsx(label, TAG, '-right-3 -top-11 text-foam/70')}>{memo.used} / 32 B</p>
      <p className={clsx(mono, TAG, '-bottom-11 -left-3 max-w-[calc(100%+1.5rem)] overflow-hidden text-ellipsis text-foam/55 max-md:hidden')}>{memoHex(memo)}</p>
    </div>
  )
}
