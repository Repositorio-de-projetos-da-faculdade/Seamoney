'use client'

import { useState } from 'react'
import { DemoRuleError } from '@/lib/demo/rules'
import { useT } from '@/lib/i18n/client'
import { useToast } from './Toaster'

type T = ReturnType<typeof useT>['t']

/** Turns a rule error into the sentence the interface shows. */
export function errorText(e: unknown, t: T): string {
  if (e instanceof DemoRuleError) return t(`app.err.${e.code}`)
  if (e instanceof Error && e.message) return e.message
  return t('app.err.generic')
}

/**
 * Runs a demo action with a busy flag (keyed, so one button spins while the others stay put) and a toast for the
 * outcome. Returns the action's result, or undefined when it failed.
 */
export function useRun() {
  const { t } = useT()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  async function run<R>(key: string, action: () => Promise<R>, success?: (result: R) => string | null): Promise<R | undefined> {
    setBusy(key)
    try {
      const result = await action()
      const text = success?.(result)
      if (text) toast.ok(text)
      return result
    } catch (e) {
      toast.bad(errorText(e, t))
      return undefined
    } finally {
      setBusy(null)
    }
  }

  return { run, busy }
}
