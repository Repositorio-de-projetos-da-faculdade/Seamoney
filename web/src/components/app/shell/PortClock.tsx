'use client'

import { useSyncExternalStore } from 'react'
import { useT } from '@/lib/i18n/client'

const PORTS = [
  { label: 'app.side.santos', zone: 'America/Sao_Paulo' },
  { label: 'app.side.shenzhen', zone: 'Asia/Shanghai' },
] as const

const TICK_MS = 10_000
/** What the server renders, so the HTML never disagrees with the browser's clock. */
const PLACEHOLDER = '--:--'

/** Re-renders the clocks every ten seconds. Minute precision is enough for a port. */
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, TICK_MS)
  return () => window.clearInterval(id)
}

/** Local time of a zone as 24-hour HH:MM. */
function timeIn(zone: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }).format(new Date())
}

/** One port's name over its local time. */
function PortTime({ label, zone }: { label: string; zone: string }) {
  const time = useSyncExternalStore(subscribe, () => timeIn(zone), () => PLACEHOLDER)
  return (
    <div>
      <dt className="font-data text-[10.5px] uppercase tracking-[0.12em] text-foam/40">{label}</dt>
      <dd className="mt-1 font-data text-[14px] tabular-nums text-foam/85">{time}</dd>
    </div>
  )
}

/** The two ends of the route, Santos and Shenzhen, as local clock times. */
export function PortClock() {
  const { t } = useT()
  return (
    <dl className="grid grid-cols-2 gap-3">
      {PORTS.map((p) => (
        <PortTime key={p.zone} label={t(p.label)} zone={p.zone} />
      ))}
    </dl>
  )
}
