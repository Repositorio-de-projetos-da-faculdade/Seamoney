'use client'

import { useSyncExternalStore } from 'react'

const formats = new Map<string, Intl.DateTimeFormat>()
const format = (zone: string) => {
  let f = formats.get(zone)
  if (!f) formats.set(zone, (f = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })))
  return f.format(new Date())
}
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 10_000)
  return () => clearInterval(id)
}

/** Local time at a port of the route. Client-only: the server cannot know the visitor's moment. */
export function PortClock({ zone }: { zone: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => format(zone),
    () => '--:--',
  )
  return <time className="tabular-nums">{time}</time>
}
