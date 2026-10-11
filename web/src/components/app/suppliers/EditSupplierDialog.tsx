'use client'

import { useState, type FormEvent } from 'react'
import { demo } from '@/lib/demo/store'
import type { Supplier } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../kit/Dialog'
import { Note } from '../kit/Panel'
import { btnGo, btnLine } from '../kit/styles'
import { useRun } from '../kit/useRun'
import { SupplierFields } from './SupplierFields'

function EditForm({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { t } = useT()
  const { run, busy } = useRun()
  const [profile, setProfile] = useState({ name: supplier.name, country: supplier.country, port: supplier.port, city: supplier.city, email: supplier.email })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!profile.name.trim()) return
    const done = await run('edit', () => demo.updateSupplier(supplier.id, profile).then(() => true), () => t('app.sup.profile.saved.toast'))
    if (done) onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SupplierFields value={profile} onChange={setProfile} />
      <Note tone="info">{t('app.sup.profile.edit.note')}</Note>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className={btnLine}>
          {t('app.cancel')}
        </button>
        <button type="submit" disabled={!profile.name.trim() || busy !== null} className={btnGo}>
          {t('app.save')}
        </button>
      </div>
    </form>
  )
}

export function EditSupplierDialog({ supplier, open, onClose }: { supplier: Supplier; open: boolean; onClose: () => void }) {
  const { t } = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('app.sup.profile.edit.title')}>
      <EditForm supplier={supplier} onClose={onClose} />
    </Dialog>
  )
}
