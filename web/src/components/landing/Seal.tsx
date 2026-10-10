import clsx from 'clsx'
import { LogoMark } from '../ui'

/**
 * A round seal, like the ones pressed on shipping papers: the text runs around the rim and turns slowly (it stops
 * for reduced motion), the brand mark sits still in the middle. Decorative: the same facts are written out nearby.
 */
export function Seal({ text, className }: { text: string; className?: string }) {
  return (
    <div className={clsx('relative grid size-36 place-items-center', className)} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="lp-spin absolute inset-0 size-full">
        <defs>
          <path id="seal-rim" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <text className="fill-current font-data text-[14.5px] font-medium uppercase tracking-[0.2em]">
          <textPath href="#seal-rim">{text}</textPath>
        </text>
      </svg>
      <LogoMark size={38} />
    </div>
  )
}
