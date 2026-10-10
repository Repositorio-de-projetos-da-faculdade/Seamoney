import type { ReactNode } from 'react'

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-900 sm:text-[34px]">{title}</h1>
        {sub ? <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  )
}
