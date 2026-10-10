// Type roles and controls of the workspace (/app), in the landing's voice: Funnel Display states titles and figures
// (light, tight), the italic serif carries the *starred* words of a title, Funnel Sans is the running text, Geist
// Mono reads out labels, codes, hashes and addresses. Actions are pills in brand green, like the landing's calls to
// action; documents are square sheets of paper.
import clsx from 'clsx'

/** Page titles. Use with <Rich> so *starred* words turn italic. */
export const display = 'desk-display font-grotesk font-normal tracking-[-0.035em] text-ink text-balance'
/** Section titles inside a sheet. */
export const heading = 'font-grotesk text-[17px] font-medium tracking-[-0.015em] text-ink'
/** Small labels above values and table columns, as on a printed form. */
export const label = 'font-data text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted'
/** Money and counts. */
export const figure = 'font-grotesk font-light tabular-nums tracking-[-0.035em]'
/** Invoice numbers, references, hashes, addresses. */
export const code = 'font-data text-[12.5px] tracking-normal'
/** Secondary text. */
export const quiet = 'text-muted'

const pill =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-text font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45'
const size = 'h-10 px-5 text-[14px]'

/** Commits money or a decision: approve, send, create. */
export const btnGo = clsx(pill, size, 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800')
/** The second choice next to a primary one. */
export const btnLine = clsx(pill, size, 'border border-ink/20 bg-transparent text-ink hover:border-ink/60')
/** Says no: reject, cancel an order. */
export const btnDanger = clsx(pill, size, 'border border-bad-ink/35 bg-transparent text-bad-ink hover:border-bad-ink hover:bg-bad-bg/50')
/** On the night surfaces (sidebar, chart). */
export const btnOnNight = clsx(pill, size, 'border border-foam/25 text-foam hover:border-foam/70')
export const btnSmall = '!h-8 !px-3.5 !text-[13px]'

export const fieldInput =
  'block h-10 w-full rounded-[3px] border border-rule bg-white px-3 text-[14.5px] text-ink placeholder:text-muted/60 hover:border-ink/35 focus:border-ink focus:outline-none focus:ring-2 focus:ring-mint/35 disabled:bg-desk disabled:text-muted'

export const textLink = 'font-medium text-ink underline decoration-ink/25 underline-offset-[4px] transition-colors hover:decoration-ink'

/* tables */
export const th = clsx(label, 'whitespace-nowrap px-4 py-3 align-bottom')
export const td = 'px-4 py-3.5 align-top'
export const tr = 'border-b border-hair last:border-b-0 transition-colors hover:bg-paper-hi'
