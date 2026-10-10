import clsx from 'clsx'
import type { T } from '@/lib/i18n/server'
import { Box } from './manifest/Box'
import { ClaimList } from './manifest/ClaimList'
import { Declaration } from './manifest/Declaration'
import { StackCells } from './manifest/StackCells'
import { Reveal } from './Reveal'
import { Seal } from './Seal'
import { ChapterTag, displayL, lede } from './type'

/** Chapter 06: the project laid out as a customs declaration, so real and simulated parts are separated on the page. */
export function Manifest({ t }: { t: T }) {
  return (
    <section id="declaration" data-chapter="declaration" className="relative z-10 overflow-hidden bg-abyss px-5 py-28 text-foam md:px-10 md:py-40 lg:pl-24">
      <div className="flex items-end justify-between gap-10">
        <div>
          <ChapterTag n={6} name={t('lp.ch.6')} className="text-foam/60" />
          <Reveal text={t('lp.manifest.title')} className={clsx(displayL, 'mt-5 text-white')} />
          <p className={clsx(lede, 'mt-6')}>{t('lp.manifest.sub')}</p>
        </div>
        <Seal text="Tempo Moderato · Chain 42431 · Testnet · " className="shrink-0 text-mint max-md:hidden" />
      </div>

      <Declaration>
        <div className="mt-16 grid gap-x-16 gap-y-14 md:mt-24 md:grid-cols-2">
          <Box n="01" label={t('lp.manifest.real')}>
            <ClaimList tone="real" items={[t('lp.manifest.real.1'), t('lp.manifest.real.2'), t('lp.manifest.real.3'), t('lp.manifest.real.4')]} />
          </Box>
          <Box n="02" label={t('lp.manifest.sim')} tone="signal">
            <ClaimList tone="sim" items={[t('lp.manifest.sim.1'), t('lp.manifest.sim.2'), t('lp.manifest.sim.3')]} />
          </Box>
          <Box n="03" label="BCB 561 · art. 50" tone="signal" className="md:col-span-2">
            <p data-row className="max-w-[78ch] font-grotesk text-[1.2rem] font-light leading-[1.45] tracking-[-0.01em] text-foam/90 md:text-[1.45rem]">
              {t('lp.manifest.law')}
            </p>
          </Box>
          <Box n="04" label={t('lp.manifest.stack')} className="md:col-span-2">
            <StackCells
              steps={[
                { name: 'Next.js', role: t('lp.stack.web') },
                { name: 'Java, Spring Boot', role: t('lp.stack.rules') },
                { name: 'Python, FastAPI', role: t('lp.stack.chain') },
                { name: 'Tempo', role: `${t('lp.stack.net')}, ${t('lp.stack.netId')}` },
              ]}
            />
          </Box>
        </div>
      </Declaration>
    </section>
  )
}
