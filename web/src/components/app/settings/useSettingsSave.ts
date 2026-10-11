'use client'

import { useEffect, useRef, useState } from 'react'
import { demo } from '@/lib/demo/store'
import type { Settings } from '@/lib/demo/types'
import { useRun } from '../kit/useRun'

const SAVED_MS = 2500

/** Saves one panel's changes and shows "Saved" for a moment. The timer is cleared when the panel unmounts. */
export function useSettingsSave() {
  const { run, busy } = useRun()
  const [saved, setSaved] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const save = (key: string, patch: Partial<Settings>) => {
    setSaved(false)
    void run(key, async () => {
      await demo.updateSettings(patch)
      return true
    }).then((ok) => {
      if (!ok) return
      setSaved(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSaved(false), SAVED_MS)
    })
  }

  return { save, busy, saved }
}
