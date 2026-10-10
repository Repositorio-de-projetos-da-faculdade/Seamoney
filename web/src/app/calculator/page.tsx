import { Calculator } from '@/components/Calculator'
import { ShipScene } from '@/components/ShipScene'
import { SiteFooter, SiteHeader } from '@/components/SiteChrome'
import { Eyebrow } from '@/components/ui'
import { getT } from '@/lib/i18n/server'

export default async function CalculatorPage() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <ShipScene variant="wide" className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-900/40" />
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:px-8 md:pb-28 md:pt-16">
          <Eyebrow onDark>{t('nav.calculator')}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t('calc.title')}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{t('calc.sub')}</p>
        </div>
      </section>
      <main className="relative z-10 mx-auto -mt-14 max-w-7xl px-5 pb-20 md:px-8">
        <Calculator />
      </main>
      <SiteFooter />
    </>
  )
}
