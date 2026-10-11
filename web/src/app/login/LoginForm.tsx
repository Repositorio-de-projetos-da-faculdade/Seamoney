'use client'

import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Card, Field, Logo, btnPrimary, input } from '@/components/ui'
import { translate, type Key, type Locale } from '@/lib/i18n/dict'
import { signIn } from './actions'
import { DemoAccountList } from './DemoAccountList'
import { DEMO_PASSWORD } from './demoAccounts'

export function LoginForm({ locale, next }: { locale: Locale; next: string }) {
  const t = (key: Key, vars?: Record<string, string | number>) => translate(locale, key, vars)
  const [state, formAction, pending] = useActionState(signIn, null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const useAccount = (account: string) => {
    setEmail(account)
    setPassword(DEMO_PASSWORD)
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 px-4 py-8 sm:py-14">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" aria-label="Seamoney">
          <Logo height={32} />
        </Link>
        <LanguageToggle />
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t('login.title')}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t('login.desc')}</p>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <Field label={t('login.email')} htmlFor="login-email">
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </Field>
            <Field label={t('login.password')} htmlFor="login-password">
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </Field>
            {state?.error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
                {t(state.error)}
              </p>
            ) : null}
            <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
              <LogIn size={18} aria-hidden="true" />
              {pending ? '…' : t('login.submit')}
            </button>
          </form>
        </Card>

        <DemoAccountList t={t} onUse={useAccount} />
      </div>
    </div>
  )
}
