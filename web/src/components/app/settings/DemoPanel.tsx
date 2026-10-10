'use client'

import { useState } from 'react'
import { demo } from '@/lib/demo/store'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../kit/Dialog'
import { Panel, PanelHead } from '../kit/Panel'
import { btnDanger, btnLine } from '../kit/styles'
import { useToast } from '../kit/Toaster'

/** Open to everyone: the data only exists in this browser. */
export function DemoPanel() {
  const { t } = useT()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  function reset() {
    demo.reset()
    setOpen(false)
    toast.ok(t('app.set.resetDone'))
  }

  return (
    <Panel aria-labelledby="set-demo">
      <PanelHead id="set-demo" title={t('app.set.demo')} meta={t('app.set.demoMeta')} />
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <p className="max-w-xl text-[14px] leading-relaxed text-ink/80">{t('app.set.demoText')}</p>
        <button type="button" className={btnDanger} onClick={() => setOpen(true)}>
          {t('app.set.reset')}
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('app.set.resetTitle')}>
        <p className="text-[14.5px] leading-relaxed text-ink/80">{t('app.set.resetText')}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnLine} onClick={() => setOpen(false)}>
            {t('app.cancel')}
          </button>
          <button type="button" className={btnDanger} onClick={reset}>
            {t('app.set.resetConfirm')}
          </button>
        </div>
      </Dialog>
    </Panel>
  )
}
