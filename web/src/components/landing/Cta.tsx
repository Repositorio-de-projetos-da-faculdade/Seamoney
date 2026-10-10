import clsx from 'clsx'
import Link from 'next/link'
import { externalProps } from './site'

// Calls to action on the landing page. On hover the label rolls up (the same words come in from below) and the arrow
// sails out of its disc while the next one sails in. Pure CSS, so these stay server components.

const SWING = 'transition-transform duration-[650ms] ease-[cubic-bezier(0.19,1,0.22,1)]'

function Roll({ children }: { children: string }) {
  return (
    <span className="relative block overflow-hidden py-0.5">
      <span className={clsx('block', SWING, 'group-hover:-translate-y-[115%]')}>{children}</span>
      <span aria-hidden="true" className={clsx('absolute inset-0 block translate-y-[115%] py-0.5', SWING, 'group-hover:translate-y-0')}>
        {children}
      </span>
    </span>
  )
}

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={clsx('size-4', className)}>
      <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDisc({ small }: { small: boolean }) {
  return (
    <span
      className={clsx(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 transition-colors duration-300 group-hover:bg-white group-hover:text-brand-700',
        small ? 'size-8' : 'size-10',
      )}
    >
      <ArrowGlyph className={clsx(SWING, 'group-hover:translate-x-[220%]')} />
      <ArrowGlyph className={clsx('absolute -translate-x-[220%]', SWING, 'group-hover:translate-x-0')} />
    </span>
  )
}

export function Cta({
  href,
  children,
  tone = 'primary',
  size = 'md',
  className,
}: {
  href: string
  children: string
  tone?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
  className?: string
}) {
  const small = size === 'sm'
  const classes = clsx(
    'group inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-grotesk font-medium tracking-[-0.01em] transition-colors duration-300',
    small ? 'h-10 text-[14px]' : 'h-13 text-[15px]',
    tone === 'primary'
      ? clsx('bg-brand-600 text-white hover:bg-brand-700', small ? 'gap-3 pl-4 pr-1' : 'gap-4 pl-6 pr-1.5')
      : clsx('border border-foam/25 text-foam hover:border-foam/70', small ? 'px-4' : 'px-6'),
    className,
  )
  const inner = (
    <>
      <Roll>{children}</Roll>
      {tone === 'primary' && <ArrowDisc small={small} />}
    </>
  )
  // in-page anchors stay plain links so Lenis can glide to them
  return href.startsWith('#') ? (
    <a href={href} className={classes}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={classes} {...externalProps(href)}>
      {inner}
    </Link>
  )
}
