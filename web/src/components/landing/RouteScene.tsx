'use client'

import { useRef, type ReactNode } from 'react'
import { useScrollScene } from './motion'
import { buildRouteTimeline } from './routemap/routeTimeline'

// Pinned stage for the map. Scroll drives the timeline; the children are server-rendered markup that it styles.
export function RouteScene({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null)

  useScrollScene(scope, (tools) => {
    if (scope.current) buildRouteTimeline(tools, scope.current)
  })

  return (
    <div ref={scope} className="relative h-[300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">{children}</div>
    </div>
  )
}
