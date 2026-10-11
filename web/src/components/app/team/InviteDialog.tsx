'use client'

import { useId, useState } from 'react'
import { demo } from '@/lib/demo/store'
import { ROLES, type Role } from '@/lib/demo/types'
import { useT } from '@/lib/i18n/client'
import { Dialog } from '../kit/Dialog'
import { FormField } from '../kit/Fields'
import { btnGo, btnLine, fieldInput } from '../kit/styles'
import { useRun } from '../kit/useRun'
import { roleDoes, roleName } from './labels'

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const { run, busy } = useRun()
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('operator')

  function close() {
    setName('')
    setEmail('')
    setRole('operator')
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const sent = await run(
      'invite',
      async () => {
        await demo.inviteMember({ name, email, role })
        return true
      },
      () => t('app.team.invitedOk', { name: name.trim() }),
    )
    if (sent) close()
  }

  return (
    <Dialog open={open} onClose={close} title={t('app.team.inviteTitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label={t('app.team.inviteName')} htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </FormField>
        <FormField label={t('app.team.inviteEmail')} htmlFor={`${id}-email`}>
          <input id={`${id}-email`} type="email" className={fieldInput} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </FormField>
        <FormField label={t('app.team.inviteRole')} htmlFor={`${id}-role`} hint={t(roleDoes[role])}>
          <select id={`${id}-role`} className={fieldInput} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(roleName[r])}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className={btnLine} onClick={close}>
            {t('app.cancel')}
          </button>
          <button type="submit" className={btnGo} disabled={busy === 'invite'}>
            {t('app.team.inviteSend')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
