import clsx from 'clsx'
import type { T } from '@/lib/i18n/server'
import { MemoTicker } from './MemoTicker'
import { Reveal } from './Reveal'
import { buildRouteGeometry } from './routemap/geometry'
import { RouteChart } from './routemap/RouteChart'
import { RouteHud } from './routemap/RouteHud'
import { RouteScene } from './RouteScene'
import { Lede } from './lede/Lede'
import { ChapterTag, displayL, label } from './type'

// Chapter 03: the bank wire against the direct Seamoney arc, on a night chart that fills the stage. The projection
// runs on the server; the client only animates.
export function RouteMap({ t }: { t: T }) {
  const geo = buildRouteGeometry()
  const labels = {
    origin: t('lp.map.stop.origin'),
    ny: t('lp.map.stop.ny'),
    hk: t('lp.map.stop.hk'),
    dest: t('lp.map.stop.dest'),
    sea: t('lp.map.sea.dest'),
    toll: t('lp.map.toll'),
  }

  return (
    <section id="route" data-chapter="route" className="relative z-10 bg-abyss text-foam">
      <MemoTicker className="bg-abyss" />
      <RouteScene>
        <div className="absolute inset-0 flex items-center justify-center max-md:items-start max-md:pt-[47svh]">
          <div className="w-[min(94%,150vh)] shrink-0 md:w-[min(78vw,122vh)] md:translate-x-[27%] md:translate-y-[3%]">
            <RouteChart geo={geo} labels={labels} />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(2_8_16/0.92),transparent_44%),linear-gradient(0deg,rgb(2_8_16/0.9),transparent_34%)]"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between px-5 pb-6 pt-24 md:px-10 md:pb-10 md:pt-28 lg:pl-24">
          <div className="max-w-[34rem] md:max-w-[max(34rem,42vw)]">
            <ChapterTag n={3} name={t('lp.ch.3')} className="text-foam/60" />
            <Reveal text={t('lp.map.title')} className={clsx(displayL, 'mt-5 text-white')} />
            <Lede size="md" text={t('lp.map.body')} className="mt-6" />
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <p className={clsx(label, 'flex items-center gap-2.5 text-foam/55 max-md:order-last')}>
              <span aria-hidden="true" className="size-2 shrink-0 rotate-45 bg-signal" />
              {t('lp.map.note')}
            </p>
            <RouteHud t={t} />
          </div>
        </div>
      </RouteScene>
    </section>
  )
}
