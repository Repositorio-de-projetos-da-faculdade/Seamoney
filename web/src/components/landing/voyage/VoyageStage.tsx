'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { encodeMemo, MEMO_SIZE } from '@/lib/memo'
import { ShipScene } from '../../ShipScene'
import { MemoFrame } from './cargo/MemoFrame'
import { CargoCopy } from './CargoCopy'
import { HeroCopy } from './HeroCopy'
import { SpeedChapter } from './SpeedChapter'
import { LENGTH, useVoyage } from './useVoyage'

const SAMPLE_REFERENCE = 'INV-2026-0845'

/**
 * The first three chapters share one WebGL scene fixed behind the page: the opening shot, the memo being loaded
 * onto the ship (chapter 01) and the ship at water level (chapter 02). The text scrolls over it.
 */
export function VoyageStage() {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [reference, setReference] = useState(SAMPLE_REFERENCE)
  const [landed, setLanded] = useState(0)
  const [edited, setEdited] = useState(false)
  const memo = useMemo(() => encodeMemo(reference), [reference])
  const onLanded = useCallback((n: number) => setLanded((prev) => (prev === n ? prev : n)), [])
  const { failed } = useVoyage({ root, canvas, frame, bytes: memo.bytes, onLanded })

  return (
    <div ref={root} className="relative">
      <div className="fixed inset-0 z-0" aria-hidden="true">
        {failed ? (
          <ShipScene variant="hero" className="h-full w-full" />
        ) : (
          <canvas ref={canvas} className="block h-full w-full" />
        )}
        {/* keeps the type legible over bright water and lights: a soft shade from the left and from the bottom */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(2_8_16/0.6),transparent_58%),linear-gradient(0deg,rgb(2_8_16/0.7),transparent_38%)]" />
        {!failed && <MemoFrame ref={frame} memo={memo} />}
      </div>

      <HeroCopy />

      <section id="cargo" data-chapter="cargo" className="relative z-10" style={{ height: `${LENGTH.cargo}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <CargoCopy
            reference={reference}
            memo={memo}
            landed={edited ? MEMO_SIZE : landed}
            onChange={(value) => {
              setEdited(true)
              setReference(value)
            }}
          />
        </div>
      </section>

      <SpeedChapter />
    </div>
  )
}
