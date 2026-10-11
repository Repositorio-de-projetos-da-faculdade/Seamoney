import { LogOut } from 'lucide-react'
import { signOut } from '@/app/login/actions'
import { getSession } from '@/lib/api'
import type { Key } from '@/lib/i18n/dict'
import { getT } from '@/lib/i18n/server'

/** Who the dashboard acts for (company and role, as the Java service sees it) and the sign-out button. */
export async function SessionBadge() {
  const [session, { t }] = await Promise.all([getSession(), getT()])
  if (!session) return null
  return (
    <div className="flex items-center gap-2">
      <p className="text-right text-xs leading-tight max-md:hidden" title={t('session.as', { email: session.email })}>
        <span className="block font-semibold text-ink">{session.organizationName}</span>
        <span className="block text-muted">
          {session.email} · {t(`role.${session.role}` as Key)}
        </span>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          aria-label={t('session.signOut')}
          title={t('session.signOut')}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-muted shadow-sm transition hover:border-brand-500/40 hover:text-ink"
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
