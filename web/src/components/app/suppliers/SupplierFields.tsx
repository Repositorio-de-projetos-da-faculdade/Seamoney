'use client'

import { useId } from 'react'
import { useT } from '@/lib/i18n/client'
import type { SupplierProfile } from '@/lib/demo/rules'
import { FormField } from '../kit/Fields'
import { fieldInput } from '../kit/styles'

export const emptyProfile: SupplierProfile = { name: '', country: '', port: '', city: '', email: '' }

/** The profile fields shared by "Add supplier" and "Edit". Controlled by the parent form. */
export function SupplierFields({ value, onChange }: { value: SupplierProfile; onChange: (next: SupplierProfile) => void }) {
  const { t } = useT()
  const id = useId()
  const set = (patch: Partial<SupplierProfile>) => onChange({ ...value, ...patch })

  return (
    <>
      <FormField label={t('app.sup.form.name')} htmlFor={`${id}-name`}>
        <input id={`${id}-name`} className={fieldInput} value={value.name} onChange={(e) => set({ name: e.target.value })} autoComplete="organization" required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('app.sup.form.country')} htmlFor={`${id}-country`} hint={t('app.sup.form.country.hint')}>
          <input id={`${id}-country`} className={fieldInput} value={value.country} maxLength={2} onChange={(e) => set({ country: e.target.value.toUpperCase() })} />
        </FormField>
        <FormField label={t('app.sup.form.port')} htmlFor={`${id}-port`} hint={t('app.sup.form.port.hint')}>
          <input id={`${id}-port`} className={fieldInput} value={value.port} maxLength={5} onChange={(e) => set({ port: e.target.value.toUpperCase() })} />
        </FormField>
      </div>
      <FormField label={t('app.sup.form.city')} htmlFor={`${id}-city`}>
        <input id={`${id}-city`} className={fieldInput} value={value.city} onChange={(e) => set({ city: e.target.value })} />
      </FormField>
      <FormField label={t('app.sup.form.email')} htmlFor={`${id}-email`}>
        <input id={`${id}-email`} type="email" className={fieldInput} value={value.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />
      </FormField>
    </>
  )
}
