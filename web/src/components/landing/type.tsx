import clsx from 'clsx'
import { Fragment, type CSSProperties } from 'react'
import { Scramble } from './Scramble'

// Shared type treatments for the landing chapters, so every section speaks with the same voice. Lettered like a
// nautical chart: Funnel Display (roman) states the facts, Instrument Serif italic carries what crosses the sea,
// Geist Mono reads out bytes, coordinates and labels, Newsreader (a text serif) is the running text.

/** Headline face. Words wrapped in *stars* in the copy switch to the italic serif (.lp-display em). */
export const display = 'lp-display font-grotesk font-normal leading-[0.94] tracking-[-0.045em] text-balance'
/** Opening and closing lines, capped by the viewport height too so three lines never run into the copy below. */
export const displayXL = `${display} text-[clamp(3.25rem,min(8.6vw,13.5svh),9.75rem)]`
/** Chapter titles. */
export const displayL = `${display} text-[clamp(2.6rem,5.4vw,6rem)]`
/** A chapter's running line (lede/Lede.tsx): the display face, light, at the size of a subhead. */
export const lede = 'font-grotesk font-light leading-[1.34] tracking-[-0.02em]'
export const ledeSize = {
  lg: 'max-w-[34ch] text-[1.3rem] md:text-[clamp(1.35rem,1.65vw,1.7rem)]',
  md: 'max-w-[34ch] text-[1.15rem] md:text-[clamp(1.12rem,1.25vw,1.3rem)]',
}
/** Bytes and hashes, kept in their own case. */
export const mono = 'font-data text-[11px] font-medium leading-[1.4] tracking-[0.08em]'
/** Coordinates and small labels. */
export const label = `${mono} uppercase`

/** Copy with *starred* words set in the italic serif. */
export function Rich({ text }: { text: string }) {
  return text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>))
}

/** Stars the last word of a line that has none (the team's slogan), so it ends in the italic like the titles. */
export const starLast = (text: string) => text.replace(/(\S+)$/, '*$1*')

/** Delay for an .lp-fade element of the opening, in seconds after the loader lifts. */
export const fadeDelay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/** The small numbered tag above a chapter title: "02 — Crossing", the name decoding as the chapter arrives. */
export function ChapterTag({ n, name, className }: { n: number; name: string; className?: string }) {
  return (
    <p className={clsx(label, 'flex items-center gap-3', className)}>
      <span className="text-mint">{String(n).padStart(2, '0')}</span>
      <span className="h-px w-8 bg-current opacity-40" aria-hidden="true" />
      <Scramble text={name} />
    </p>
  )
}
