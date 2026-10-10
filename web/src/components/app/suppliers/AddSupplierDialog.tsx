'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { demo } from '@/lib/demo/store'
import { isWallet } from '@/lib/demo/rules'
import type { Network } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../kit/Dialog'
import { Note } from '../kit/Panel'
import { btnGo, btnLine } from '../kit/styles'
import { useRun } from '../kit/useRun'
import { emptyProfile, SupplierFields } from './SupplierFields'
import { WalletFields } from './WalletFields'

function AddForm({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const { run, busy } = useRun()
  const router = useRouter()
  const [profile, setProfile] = useState(emptyProfile)
  const [network, setNetwork] = useState<Network>('tempo')
  const [wallet, setWallet] = useState('')
  const ready = profile.name.trim() !== '' && isWallet(network, wallet.trim())

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    const id = await run('add', () => demo.addSupplier({ ...profile, network, wallet: wallet.trim() }), () => t('app.sup.created.toast'))
    if (id) {
      onClose()
      router.push(`/app/suppliers/${id}`)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SupplierFields value={profile} onChange={setProfile} />
      <WalletFields network={network} address={wallet} onNetwork={setNetwork} onAddress={setWallet} />
      <Note tone="info">{t('app.sup.form.proposalNote')}</Note>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={btnLine}>
          {t('app.cancel')}
        </button>
        <button type="submit" disabled={!ready || busy !== null} className={btnGo}>
          {t('app.sup.form.create')}
        </button>
      </div>
    </form>
  )
}

export function AddSupplierDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('app.sup.form.add')} wide>
      <AddForm onClose={onClose} />
    </Dialog>
  )
}
