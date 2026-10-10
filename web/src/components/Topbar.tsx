import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import { LanguageToggle } from './LanguageToggle'
import { btnPrimary, Logo } from './ui'

export async function Topbar() {
  const { t } = await getT()
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-page/85 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-5 py-3 lg:px-10">
        {/* phones show the brand here because the sidebar is hidden */}
        <Link href="/" aria-label="Seamoney" className="rounded-lg bg-navy-900 px-3 py-2 lg:hidden">
          <Logo height={24} />
        </Link>

        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-muted shadow-sm ring-1 ring-line max-lg:hidden">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
          {t('topbar.env')}
        </p>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/dashboard/orders/new" className={`${btnPrimary} !min-h-10 !px-4 max-sm:hidden`}>
            <Plus size={16} aria-hidden="true" />
            {t('orders.new')}
          </Link>
        </div>
      </div>
    </header>
  )
}
