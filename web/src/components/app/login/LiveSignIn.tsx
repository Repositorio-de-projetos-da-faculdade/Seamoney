'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'
import { signInLive } from '@/lib/demo/backend'
import { demo } from '@/lib/demo/store'
import { useT } from '@/lib/i18n/client'
import type { Key } from '@/lib/i18n/dict'
import { btnGo, label } from '../kit/styles'

// The accounts of the rules service's demo seed for the company this workspace shows. Fictitious, password demo123.
const ACCOUNTS = [
  { email: 'porto.approver@example.com', role: 'approver' },
  { email: 'porto.operator@example.com', role: 'operator' },
  { email: 'porto.owner@example.com', role: 'owner' },
  { email: 'porto.accountant@example.com', role: 'accountant' },
] as const
const DEMO_PASSWORD = 'demo123'

const input =
  'mt-2 block h-11 w-full rounded-[3px] border border-foam/20 bg-night px-3 text-[15px] text-white placeholder:text-foam/35 hover:border-foam/40 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30'

/** Real sign-in with the rules service. Payments made after it settle on the Tempo testnet. */
export function LiveSignIn() {
  const { t } = useT()
  const router = useRouter()
  const id = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<Key | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await signInLive(email.trim(), password)
    if ('error' in result) {
      setError(result.error)
      setBusy(false)
      return
    }
    demo.connect(result.role)
    router.push('/app')
  }

  return (
    <section aria-labelledby={`${id}-title`} className="border border-mint/25 bg-night/60 p-5 sm:p-6">
      <h2 id={`${id}-title`} className="font-grotesk text-[20px] tracking-[-0.02em] text-white">
        {t('app.live.title')}
      </h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-foam/65">{t('app.live.lede')}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={`${label} !text-foam/60`}>{t('login.email')}</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={`${label} !text-foam/60`}>{t('login.password')}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        {error ? (
          <p role="alert" className="text-[14px] text-signal sm:col-span-2">
            {t(error)}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className={btnGo}>
            {busy ? '…' : t('login.submit')}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-foam/10 pt-4">
        <p className={`${label} !text-foam/50`}>{t('app.live.accounts')}</p>
        <ul className="mt-2 divide-y divide-foam/10">
          {ACCOUNTS.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-foam">{a.email}</span>
                <span className={`${label} !text-mint`}>{t(`app.role.${a.role}`)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail(a.email)
                  setPassword(DEMO_PASSWORD)
                }}
                className="shrink-0 rounded-full border border-foam/25 px-3 py-1 text-[13px] text-foam transition-colors hover:border-foam/70"
              >
                {t('login.use')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
