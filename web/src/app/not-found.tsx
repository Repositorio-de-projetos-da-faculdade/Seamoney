import { Compass } from 'lucide-react'
import Link from 'next/link'
import { ShipScene } from '@/components/ShipScene'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { btnPrimary } from '@/components/ui'
import { getT } from '@/lib/i18n/server'

export default async function NotFound() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="relative isolate overflow-hidden bg-navy-900 text-white">
        <ShipScene variant="bow" className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/85 to-navy-900/30" />
        <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-start justify-center gap-6 px-5 py-20 md:px-8">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-aqua ring-1 ring-white/15">
            <Compass size={26} aria-hidden="true" />
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">404</h1>
          <p className="max-w-md text-lg text-white/80">{t('notfound.text')}</p>
          <Link href="/" className={btnPrimary}>
            {t('side.back')}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
