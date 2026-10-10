import { Layers, PiggyBank, ShieldCheck, Zap } from 'lucide-react'
import type { T } from '@/lib/i18n/server'
import { ShipScene } from '../ShipScene'
import { IconTile, Logo } from '../ui'

/** "Technology that connects Brazil to the world": the dark panel of the mockup, with the ship behind it. */
export function TechPanel({ t }: { t: T }) {
  const pillars = [
    { icon: PiggyBank, title: t('tech.1.title'), desc: t('tech.1.desc') },
    { icon: Zap, title: t('tech.2.title'), desc: t('tech.2.desc') },
    { icon: ShieldCheck, title: t('tech.3.title'), desc: t('tech.3.desc') },
    { icon: Layers, title: t('tech.4.title'), desc: t('tech.4.desc') },
  ]

  return (
    <section className="relative isolate overflow-hidden rounded-[32px] bg-navy-900 text-white shadow-pop">
      <ShipScene variant="bow" className="absolute inset-0 -z-20 h-full w-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy-900/85 to-navy-900/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />

      <div className="px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <h2 className="max-w-xl font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl">
          {t('tech.lead')} <span className="text-aqua">{t('tech.accent')}</span>
        </h2>

        <ul className="mt-10 grid max-w-3xl gap-x-10 gap-y-7 sm:grid-cols-2">
          {pillars.map(({ icon, title, desc }) => (
            <li key={title} className="flex items-start gap-4">
              <IconTile icon={icon} tone="dark" size={52} />
              <div>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/75">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Logo height={34} />
          <p className="text-sm font-medium text-white/80">{t('brand.closing')}</p>
        </div>
      </div>
    </section>
  )
}
