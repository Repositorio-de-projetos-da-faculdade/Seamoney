import clsx from 'clsx'
import { label, mono } from '../type'

export interface TicketData {
  id: 'bank' | 'route'
  /** "Route 01", the small number on the stub. */
  no: string
  name: string
  via: string
  lostLabel: string
  /** Share lost on the way, in percent. */
  pct: number
  pctText: string
  /** Bar width on the shared scale, 0 to 100. */
  barPct: number
  /** Optional faint band behind the bar (the typical range of bank estimates), as left and width in percent. */
  band?: { left: number; width: number }
  per: string
  note: string
}

const TONE = {
  bank: { sheet: 'bg-paper', pct: 'text-ink', bar: 'bg-bank', no: 'text-ink/50' },
  route: { sheet: 'bg-paper-hi', pct: 'text-brand-600', bar: 'bg-brand-600', no: 'text-brand-600' },
}

/**
 * One route as a paper ticket: the stub with the route, the share lost in large figures, a torn perforation and the
 * worked example underneath. The notches are discs in the chapter's night colour, so the ticket reads as punched.
 */
export function Ticket({ data }: { data: TicketData }) {
  const tone = TONE[data.id]

  return (
    <article
      data-s="ticket"
      className={clsx(
        'relative text-ink shadow-[0_2px_6px_-2px_rgb(2_8_16/0.4),0_40px_90px_-40px_rgb(2_8_16/0.9)]',
        tone.sheet,
      )}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className={clsx(label, tone.no)}>{data.no}</p>
          <p className={clsx(label, 'text-ink/50')}>BRL → USD</p>
        </div>
        <h3 className="mt-5 font-grotesk text-[1.45rem] font-normal leading-tight tracking-[-0.025em] md:text-[1.7rem]">{data.name}</h3>
        <p className="mt-1.5 font-text text-[14px] leading-snug text-ink/60">{data.via}</p>

        <div className="mt-8 flex items-end justify-between gap-4">
          <p className={clsx(label, 'pb-2 text-ink/55')}>{data.lostLabel}</p>
          <p
            data-s="pct"
            data-to={data.pct}
            className={clsx('font-grotesk text-[clamp(3.6rem,7vw,6.5rem)] font-light leading-[0.85] tracking-[-0.055em] tabular-nums', tone.pct)}
          >
            {data.pctText}
          </p>
        </div>
        <div className="relative mt-5 h-1.5 w-full bg-ink/10" aria-hidden="true">
          {data.band && <div className="absolute inset-y-0 bg-bank/20" style={{ left: `${data.band.left}%`, width: `${data.band.width}%` }} />}
          <div data-s="fill" className={clsx('absolute inset-y-0 left-0 origin-left', tone.bar)} style={{ width: `${data.barPct}%` }} />
        </div>
      </div>

      {/* the perforation: a dashed rule between two punched notches */}
      <div className="relative h-0" aria-hidden="true">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-night" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-night" />
        <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-ink/20" />
      </div>

      <div className="space-y-2.5 p-6 md:px-8 md:py-7">
        <p className={clsx(mono, 'text-ink')}>{data.per}</p>
        <p className="font-text text-[13px] leading-relaxed text-ink/60">{data.note}</p>
      </div>
    </article>
  )
}
