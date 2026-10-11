import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGovernor } from './governor.ts'

// A wrong step here costs either a laggy tablet or a blurry desktop, so the rules are pinned down.

function run(frames: number[]) {
  let taken = 0
  const governor = createGovernor([() => taken++, () => taken++, () => taken++])
  frames.forEach((ms) => governor.frame(ms))
  return taken
}

const repeat = (ms: number, n: number) => Array<number>(n).fill(ms)

test('a device that keeps up gives nothing up', () => {
  assert.equal(run(repeat(16.7, 1000)), 0)
})

test('a 90 Hz screen capped at 60 fps (frames of 11 and 22 ms) counts as keeping up', () => {
  assert.equal(run(Array.from({ length: 1000 }, (_, i) => (i % 2 ? 11.1 : 22.2))), 0)
})

test('hitches do not count: one slow frame in ten is trimmed away', () => {
  assert.equal(run(Array.from({ length: 1000 }, (_, i) => (i % 10 === 0 ? 120 : 16.7))), 0)
})

test('a slow device steps down once per window, after the warm-up', () => {
  assert.equal(run(repeat(30, 60 + 89)), 0)
  assert.equal(run(repeat(30, 60 + 90)), 1)
  assert.equal(run(repeat(30, 2 * (60 + 90))), 2)
})

test('a pause (hidden tab, scene off screen) restarts the measurement instead of counting as slow', () => {
  assert.equal(run([...repeat(30, 100), 5000, ...repeat(30, 100)]), 0)
})

test('it stops once there is nothing left to give up', () => {
  assert.equal(run(repeat(40, 10_000)), 3)
})
