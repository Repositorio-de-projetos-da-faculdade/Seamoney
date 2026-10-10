import { ArrowRight, FileCheck, Percent, ScanLine, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import { Calculator } from '@/components/Calculator'
import { HeroCard } from '@/components/landing/HeroCard'
import { StoryCards } from '@/components/landing/StoryCards'
import { TechPanel } from '@/components/landing/TechPanel'
import { ShipScene } from '@/components/ShipScene'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { btnLight, btnOnDark, btnPrimary, Eyebrow, IconTile, LogoMark } from '@/components/ui'
import { getT } from '@/lib/i18n/server'

export default async function Home() {
  const { t } = await getT()

  const facts = [
    { icon: Percent, text: t('fact.fees') },
    { icon: Zap, text: t('fact.speed') },
    { icon: ScanLine, text: t('fact.recon') },
  ]
  const perks = [
    { icon: Percent, title: t('perk.fees.title'), desc: t('perk.fees.desc') },
    { icon: Zap, title: t('perk.speed.title'), desc: t('perk.speed.desc') },
    { icon: FileCheck, title: t('perk.recon.title'), desc: t('perk.recon.desc') },
    { icon: ShieldCheck, title: t('perk.trust.title'), desc: t('perk.trust.desc') },
  ]

  return (
    <>
      <SiteHeader />
      <main>
        {/* ------------------------------ hero ------------------------------ */}
        <section className="relative isolate overflow-hidden bg-navy-900 text-white">
          <ShipScene variant="hero" className="absolute inset-0 -z-20 h-full w-full max-lg:hidden" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/45 to-transparent max-lg:hidden" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-900/60 via-transparent to-navy-900/30 max-lg:hidden" />

          <div className="absolute -left-32 top-10 -z-10 h-[460px] w-[460px] rounded-full bg-navy-500/30 blur-[120px]" aria-hidden="true" />
          <div className="absolute right-0 top-0 -z-10 h-[360px] w-[520px] rounded-full bg-aqua/10 blur-[120px]" aria-hidden="true" />

          <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 md:px-8 lg:min-h-[700px] lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
            <div className="animate-rise">
              <Eyebrow onDark>{t('hero.demo')}</Eyebrow>
              <h1 className="mt-6 font-display text-[40px] font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-[60px]">
                {t('hero.lead')} <span className="bg-gradient-to-r from-aqua to-mint bg-clip-text text-transparent">{t('hero.accent')}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{t('hero.sub')}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/dashboard/orders/new" className={`${btnPrimary} !min-h-12 !px-7`}>
                  {t('hero.cta')} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/calculator" className={`${btnOnDark} !min-h-12 !px-7`}>
                  {t('hero.cta2')}
                </Link>
              </div>

              <ul className="mt-12 grid max-w-xl gap-4 sm:grid-cols-3">
                {facts.map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm font-semibold leading-snug text-white/90">
                    <IconTile icon={icon} tone="dark" size={40} />
                    <span className="pt-0.5">{text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-white/55">{t('fact.footnote')}</p>
            </div>

            {/* phones and tablets: the ship gets its own band instead of sitting behind the text */}
            <div className="-mx-5 overflow-hidden md:mx-0 md:rounded-3xl lg:hidden">
              <ShipScene variant="full" className="block aspect-[770/380] w-full" />
            </div>

            <HeroCard t={t} />
          </div>
        </section>

        {/* ------------------------------ slogan ------------------------------ */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
            <div className="mx-auto mb-6 w-fit">
              <LogoMark size={44} tone="onLight" />
            </div>
            <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl md:text-[44px]">{t('brand.tagline')}</p>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t('brand.pitch')}</p>
          </div>
        </section>

        {/* ------------------------------ perks ------------------------------ */}
        <section className="bg-page">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {perks.map(({ icon, title, desc }) => (
                <li key={title} className="group rounded-[22px] border border-line bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                  <IconTile icon={icon} size={52} />
                  <h2 className="mt-5 font-display text-lg font-bold leading-snug">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------ how it works ------------------------------ */}
        <section id="how" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
            <div className="max-w-2xl">
              <Eyebrow>{t('how.title')}</Eyebrow>
              <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">{t('story.title')}</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{t('story.sub')}</p>
            </div>
            <StoryCards t={t} />
          </div>
        </section>

        {/* ------------------------------ calculator teaser ------------------------------ */}
        <section className="relative isolate overflow-hidden bg-navy-900 text-white">
          <div className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-navy-500/40 blur-[120px]" aria-hidden="true" />
          <div className="absolute -bottom-40 -left-40 -z-10 h-[420px] w-[420px] rounded-full bg-mint/10 blur-[110px]" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{t('try.title')}</h2>
              <p className="mt-4 text-lg leading-relaxed text-white/75">{t('try.sub')}</p>
            </div>
            <Calculator variant="teaser" />
          </div>
        </section>

        {/* ------------------------------ technology ------------------------------ */}
        <section className="bg-page">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
            <TechPanel t={t} />
          </div>
        </section>

        {/* ------------------------------ final call ------------------------------ */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-navy-700 text-white">
          <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(60%_80%_at_85%_20%,#24e4b4,transparent)]" aria-hidden="true" />
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 md:flex-row md:items-center md:px-8 md:py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{t('cta.title')}</h2>
              <p className="mt-3 text-lg leading-relaxed text-white/85">{t('cta.sub')}</p>
            </div>
            <Link href="/dashboard/orders/new" className={`${btnLight} !min-h-12 shrink-0 !px-8`}>
              {t('hero.cta')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
