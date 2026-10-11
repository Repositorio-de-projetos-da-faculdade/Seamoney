'use client'

import { useActionState } from 'react'
import { unlock } from './actions'
import { translate } from '@/lib/i18n/dict'
import { LangSwitch } from '@/components/landing/LangSwitch'

export function UnlockForm({ locale }: { locale: 'en' | 'pt' }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => await unlock(formData),
    null
  )

  const t = (key: any) => translate(locale, key)

  return (
    <div className="min-h-screen flex flex-col bg-(--color-abyss) text-(--color-foam) items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LangSwitch />
      </div>
      
      <div className="max-w-md w-full bg-(--color-night) p-8 rounded-2xl border border-(--color-tide) shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-medium text-white mb-3">{t('unlock.title')}</h1>
          <p className="text-(--color-bank-soft)">{t('unlock.desc')}</p>
        </div>
        
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-(--color-bank-soft)">
              {t('unlock.password')}
            </label>
            <input 
              type="password" 
              name="password"
              required
              className="w-full bg-(--color-abyss) border border-(--color-tide) rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-mint) transition-shadow"
            />
          </div>
          
          {state?.error && (
            <div className="text-(--color-bad-bg) text-sm bg-(--color-bad-ink)/20 px-4 py-2 rounded-lg">
              {t(state.error)}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isPending}
            className="mt-4 bg-(--color-brand-600) hover:bg-(--color-brand-500) text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {isPending ? '...' : t('unlock.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
