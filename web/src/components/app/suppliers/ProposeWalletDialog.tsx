'use client'

import { useState, type FormEvent } from 'react'
import { demo } from '@/lib/demo/store'
import { isWallet } from '@/lib/demo/rules'
import type { Network, Supplier } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../kit/Dialog'
import { Note } from '../kit/Panel'
import { btnGo, btnLine } from '../kit/styles'
import { useRun } from '../kit/useRun'
import { WalletFields } from './WalletFields'

function ProposeForm({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { t } = useT()
  const { run, busy } = useRun()
  const [network, setNetwork] = useState<Network>(supplier.wallets.find((w) => w.status === 'approved')?.network ?? 'tempo')
  const [address, setAddress] = useState('')
  const ready = isWallet(network, address.trim())
  const replaces = supplier.wallets.some((w) => w.network === network && w.status === 'proposed')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    const done = await run('propose', () => demo.proposeWallet(supplier.id, network, address.trim()).then(() => true), () => t('app.sup.propose.toast'))
    if (done) onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <WalletFields network={network} address={address} onNetwork={setNetwork} onAddress={setAddress} />
      <Note tone="warn">{t('app.sup.propose.note')}</Note>
      {replaces ? <Note tone="info">{t('app.sup.propose.replace')}</Note> : null}
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={btnLine}>
          {t('app.cancel')}
        </button>
        <button type="submit" disabled={!ready || busy !== null} className={btnGo}>
          {t('app.sup.propose.submit')}
        </button>
      </div>
    </form>
  )
}

export function ProposeWalletDialog({ supplier, open, onClose }: { supplier: Supplier; open: boolean; onClose: () => void }) {
  const { t } = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('app.sup.propose.title')}>
      <ProposeForm supplier={supplier} onClose={onClose} />
    </Dialog>
  )
}
