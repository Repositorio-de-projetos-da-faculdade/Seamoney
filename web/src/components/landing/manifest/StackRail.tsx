import clsx from 'clsx'
import { label } from '../type'

export interface StackStep {
  name: string
  role: string
}

/**
 * The services in the order a payment travels through them, as stations on one line with a payment running along
 * it (CSS, see .lp-rail; it stops for reduced motion). Two by two on phones.
 */
export function StackRail({ steps }: { steps: StackStep[] }) {
  return (
    <div data-row className="relative">
      <span aria-hidden="true" className="absolute inset-x-0 top-[4px] h-px bg-foam/15 max-md:hidden">
        <span className="lp-rail absolute -top-[3px] size-[7px] rounded-full bg-mint shadow-[0_0_12px_rgb(36_228_180/0.8)]" />
      </span>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-4">
        {steps.map((step) => (
          <li key={step.name} className="relative">
            <span aria-hidden="true" className="block size-[9px] rotate-45 border border-mint bg-abyss" />
            <p className="mt-4 font-grotesk text-[1.3rem] leading-tight tracking-[-0.02em] text-white md:text-[1.5rem]">{step.name}</p>
            <p className={clsx(label, 'mt-1.5 text-foam/45')}>{step.role}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
