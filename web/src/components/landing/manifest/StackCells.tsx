import { ArrowDown, ArrowRight } from 'lucide-react'

export interface StackStep {
  name: string
  role: string
}

/** The services in the order a payment travels through them: down on mobile, across on desktop. */
export function StackCells({ steps }: { steps: StackStep[] }) {
  return (
    <ol className="grid gap-px border border-foam/12 bg-foam/12 md:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.name} data-row className="relative flex min-h-40 flex-col justify-between bg-abyss p-5 md:p-6">
          <span className="font-data text-[10px] font-medium tabular-nums text-mint">{String(i + 1).padStart(2, '0')}</span>
          <span className="mt-8 font-grotesk text-[1.75rem] leading-[1.02] tracking-[-0.035em] text-white">{step.name}</span>
          <span className="mt-2 font-text text-[13px] leading-snug text-foam/55">{step.role}</span>
          {i < steps.length - 1 && (
            <>
              <ArrowDown aria-hidden="true" className="absolute -bottom-3 left-1/2 z-10 size-5 -translate-x-1/2 bg-abyss p-0.5 text-mint md:hidden" />
              <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 size-5 -translate-y-1/2 bg-abyss p-0.5 text-mint max-md:hidden" />
            </>
          )}
        </li>
      ))}
    </ol>
  )
}
