import clsx from 'clsx'
import { PortClock } from '../PortClock'
import { label, mono } from '../type'

const PORTS = [
  { name: 'Santos', zone: 'America/Sao_Paulo', at: '23°57′S 46°19′W' },
  { name: 'Shenzhen', zone: 'Asia/Shanghai', at: '22°31′N 114°03′E' },
]

function Port({ name, zone, at, end }: (typeof PORTS)[number] & { end?: boolean }) {
  return (
    <div className={clsx('flex flex-col', end && 'items-end text-right')}>
      <p className={clsx(label, 'text-foam/55')}>{name}</p>
      <p className="mt-2 font-grotesk text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-none tracking-[-0.04em] text-white">
        <PortClock zone={zone} />
      </p>
      <p className={clsx(mono, 'mt-2 text-foam/40')}>{at}</p>
    </div>
  )
}

/**
 * The end of the voyage, in place of a giant wordmark: the two ports with their local time, and the route between
 * them with a payment running along it (CSS, .lp-rail; it stops for reduced motion) carrying the sample memo.
 */
export function VoyageLine({ memo }: { memo: string }) {
  const [from, to] = PORTS
  return (
    <div aria-label={`${from.name} — ${to.name}`} role="group">
      <div className="flex items-end justify-between gap-6">
        <Port {...from} />
        <Port {...to} end />
      </div>
      <div className="relative mt-8 flex items-center" aria-hidden="true">
        <span className="size-2.5 shrink-0 rotate-45 border border-mint bg-abyss" />
        <span className="relative mx-1 h-px flex-1 bg-[repeating-linear-gradient(90deg,rgb(227_235_238/0.28)_0_6px,transparent_6px_12px)]">
          <span className="lp-rail absolute -top-[3px] size-[7px] rounded-full bg-mint shadow-[0_0_14px_rgb(36_228_180/0.9)]" />
        </span>
        <span className="size-2.5 shrink-0 rotate-45 bg-mint" />
      </div>
      <p className={clsx(mono, 'mt-4 text-center text-foam/45')}>
        memo <span className="text-mint">{memo}</span> · 32 bytes
      </p>
    </div>
  )
}
