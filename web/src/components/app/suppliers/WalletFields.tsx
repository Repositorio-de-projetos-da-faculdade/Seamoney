'use client'

import clsx from 'clsx'
import { useId, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { isWallet } from '@/lib/demo/rules'
import { NETWORKS, type Network } from '@/lib/demo/types'
import { FormField } from '../kit/Fields'
import { code, fieldInput } from '../kit/styles'

/** Network and address, with the address checked for the chosen network once the person has typed something. */
export function WalletFields({ network, address, onNetwork, onAddress }: { network: Network; address: string; onNetwork: (n: Network) => void; onAddress: (a: string) => void }) {
  const { t } = useT()
  const id = useId()
  const [touched, setTouched] = useState(false)
  const bad = touched && address.trim() !== '' && !isWallet(network, address.trim())

  return (
    <>
      <FormField label={t('app.sup.form.network')} htmlFor={`${id}-net`}>
        <select id={`${id}-net`} className={fieldInput} value={network} onChange={(e) => onNetwork(e.target.value as Network)}>
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {t(`app.net.${n}.long`)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t('app.sup.form.wallet')} htmlFor={`${id}-addr`} hint={t(`app.sup.form.wallet.${network}`)} error={bad ? t('app.sup.form.wallet.bad') : undefined}>
        <input
          id={`${id}-addr`}
          className={clsx(fieldInput, code)}
          value={address}
          onChange={(e) => onAddress(e.target.value)}
          onBlur={() => setTouched(true)}
          spellCheck={false}
          autoComplete="off"
          required
        />
      </FormField>
    </>
  )
}
