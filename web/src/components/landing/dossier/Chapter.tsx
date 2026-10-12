import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Reveal } from '../Reveal'
import { Lede } from '../lede/Lede'
import { ChapterTag, displayL } from '../type'

/**
 * A chapter of the dossier that follows the voyage (networks, rules, business): the numbered tag, the title rising
 * line by line, the spoken lede, then the facts. Night chapters sit on the abyss; the paper one on the light sheet.
 */
export function Chapter({
  id,
  n,
  name,
  title,
  body,
  tone = 'night',
  children,
}: {
  id: string
  n: number
  name: string
  title: string
  body: string
  tone?: 'night' | 'paper'
  children: ReactNode
}) {
  const paper = tone === 'paper'
  return (
    <section id={id} data-chapter={id} className={clsx('relative z-10 px-5 py-24 md:px-10 md:py-32 lg:pl-24', paper ? 'lp-paper bg-paper text-ink' : 'bg-abyss text-foam')}>
      <div className="max-w-[46rem]">
        <ChapterTag n={n} name={name} className={paper ? 'text-ink/60' : 'text-foam/60'} />
        <Reveal text={title} className={clsx(displayL, 'mt-5', paper ? 'text-ink' : 'text-white')} />
        <Lede size="md" text={body} tone={paper ? 'paper' : 'night'} className="mt-6" />
      </div>
      <div className="mt-14 md:mt-20">{children}</div>
    </section>
  )
}
