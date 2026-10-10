import clsx from 'clsx'
import type { T } from '@/lib/i18n/server'
import { Lede } from './lede/Lede'
import { Declaration } from './manifest/Declaration'
import { LawNote } from './manifest/LawNote'
import { ManifestTable } from './manifest/ManifestTable'
import { StackRail } from './manifest/StackRail'
import { Reveal } from './Reveal'
import { Seal } from './Seal'
import { ChapterTag, displayL, label } from './type'

/**
 * Chapter 06: the project laid out as a customs declaration, one stamped line per item, so what is real and what is
 * simulated reads at a glance. The legal note is one sentence, with the full rule a click away.
 */
export function Manifest({ t }: { t: T }) {
  const real = (key: Parameters<T>[0]) => ({ text: t(key), status: 'real' as const, stamp: t('lp.manifest.st.real') })
  const sim = (key: Parameters<T>[0], stamp: Parameters<T>[0]) => ({ text: t(key), status: 'sim' as const, stamp: t(stamp) })

  return (
    <section id="declaration" data-chapter="declaration" className="relative z-10 overflow-hidden bg-abyss px-5 py-28 text-foam md:px-10 md:py-40 lg:pl-24">
      <div className="flex items-end justify-between gap-10">
        <div>
          <ChapterTag n={6} name={t('lp.ch.6')} className="text-foam/60" />
          <Reveal text={t('lp.manifest.title')} className={clsx(displayL, 'mt-5 text-white')} />
          <Lede text={t('lp.manifest.sub')} className="mt-6" />
        </div>
        <Seal text="Tempo Moderato · Chain 42431 · Testnet · " className="shrink-0 text-mint max-md:hidden" />
      </div>

      <Declaration>
        <div className="mt-16 max-w-[80rem] md:mt-24">
          <ManifestTable
            groups={[
              {
                title: t('lp.manifest.real'),
                tone: 'mint',
                lines: [real('lp.manifest.real.1'), real('lp.manifest.real.2'), real('lp.manifest.real.3'), real('lp.manifest.real.4'), real('lp.manifest.real.5')],
              },
              {
                title: t('lp.manifest.sim'),
                tone: 'signal',
                lines: [
                  sim('lp.manifest.sim.1', 'lp.manifest.st.sim'),
                  sim('lp.manifest.sim.2', 'lp.manifest.st.none'),
                  sim('lp.manifest.sim.3', 'lp.manifest.st.est'),
                ],
              },
            ]}
          />
        </div>

        <div className="mt-20 grid max-w-[80rem] gap-16 md:mt-28">
          <LawNote short={t('lp.manifest.law.short')} full={t('lp.manifest.law')} more={t('lp.manifest.law.more')} />
          <div>
            <p className={clsx(label, 'relative mb-8 pt-4 text-foam/60')}>
              <span data-rule aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-foam/25" />
              {t('lp.manifest.stack')}
            </p>
            <StackRail
              steps={[
                { name: 'Next.js', role: t('lp.stack.web') },
                { name: 'Java, Spring Boot', role: t('lp.stack.rules') },
                { name: 'Python, FastAPI', role: t('lp.stack.chain') },
                { name: 'Tempo', role: `${t('lp.stack.net')}, ${t('lp.stack.netId')}` },
              ]}
            />
          </div>
        </div>
      </Declaration>
    </section>
  )
}
