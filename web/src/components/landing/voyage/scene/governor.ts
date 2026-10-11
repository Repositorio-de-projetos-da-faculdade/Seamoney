// Watches how long frames really take and steps the scene down while the device cannot keep up, one step per
// measurement window. It never steps back up, so the picture does not pump; a reload starts again from the tier.

/** Slower than this (about 45 fps), on average, and the scene gives something up. */
const BUDGET_MS = 22
/** Frames ignored after a start, a pause or a step: shader compiles and the first layouts are not the steady state. */
const WARMUP = 60
const WINDOW = 90

export function createGovernor(steps: (() => void)[]) {
  const pending = [...steps]
  const samples: number[] = []
  let warm = 0

  function restart() {
    samples.length = 0
    warm = 0
  }

  /** Trimmed mean: hitches (garbage collection, a heavy scroll frame) and the odd short frame do not count. */
  function typical() {
    const sorted = [...samples].sort((a, b) => a - b)
    const cut = Math.floor(sorted.length * 0.1)
    const kept = sorted.slice(cut, sorted.length - cut)
    return kept.reduce((sum, v) => sum + v, 0) / kept.length
  }

  return {
    /** Time since the previous rendered frame, in milliseconds. */
    frame(ms: number) {
      if (!pending.length) return
      // a hidden tab or a scroll-paused scene: not a slow frame
      if (ms > 250) return restart()
      if (warm < WARMUP) return void warm++
      samples.push(ms)
      if (samples.length < WINDOW) return
      if (typical() > BUDGET_MS) pending.shift()?.()
      restart()
    },
    restart,
  }
}
