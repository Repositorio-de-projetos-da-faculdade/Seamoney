import type { ReactNode } from 'react'

const BASE =
  'flex items-start gap-3 border border-rule px-4 py-3 has-[:checked]:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mint/40'

/** One settlement network as a row: name, hint, token and a status chip. A row with a radio is a label, so the whole row is clickable. */
export function NetworkRow({
  htmlFor,
  control,
  title,
  hint,
  token,
  status,
}: {
  htmlFor?: string
  control?: ReactNode
  title: string
  hint: string
  token: string
  status: ReactNode
}) {
  const body = (
    <>
      {control}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{hint}</span>
        <span className="mt-1.5 block break-words text-[12.5px] text-muted">{token}</span>
      </span>
      <span className="shrink-0 self-start">{status}</span>
    </>
  )
  if (!htmlFor) return <div className={BASE}>{body}</div>
  return (
    <label htmlFor={htmlFor} className={`${BASE} cursor-pointer`}>
      {body}
    </label>
  )
}
