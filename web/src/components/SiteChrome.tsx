import Link from 'next/link'
import { getT } from '@/lib/i18n/server'
import { LanguageToggle } from './LanguageToggle'
import { MobileNav } from './MobileNav'
import { btnPrimary, Logo } from './ui'

export async function SiteHeader() {
  const { t } = await getT()
  const links = [
    { href: '/#how', label: t('nav.how') },
    { href: '/calculator', label: t('nav.calculator') },
    { href: '/app', label: t('nav.dashboard') },
  ]
  const cta = { href: '/app', label: t('nav.getStarted') }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/80 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link href="/" aria-label="Seamoney" className="shrink-0">
          <Logo height={34} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="max-md:hidden">
            <LanguageToggle onDark />
          </div>
          <Link href={cta.href} className={`${btnPrimary} !min-h-10 !px-4 max-md:hidden`}>
            {cta.label}
          </Link>
          <MobileNav links={links} cta={cta} openLabel={t('nav.menu')} closeLabel={t('nav.close')} />
        </div>
      </div>
    </header>
  )
}

export async function SiteFooter() {
  const { t } = await getT()
  return (
    <footer className="bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1.6fr] md:px-8">
        <div>
          <Logo height={38} />
          <p className="mt-5 max-w-sm font-display text-lg font-semibold leading-snug text-white/90">{t('brand.tagline')}</p>
          <p className="mt-3 text-sm text-aqua">{t('brand.closing')}</p>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/50">{t('footer.nav')}</h2>
          <ul className="mt-4 space-y-1 text-[15px]">
            {[
              ['/#how', t('nav.how')],
              ['/calculator', t('nav.calculator')],
              ['/app', t('nav.dashboard')],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-9 items-center text-white/75 transition hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/50">{t('footer.disclosure')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{t('disclaimer.demo')}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-white/50 md:px-8">{t('footer.built')}</p>
      </div>
    </footer>
  )
}
