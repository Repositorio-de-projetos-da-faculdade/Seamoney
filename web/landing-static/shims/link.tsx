import type { AnchorHTMLAttributes } from 'react'

/** Stand-in for next/link in the static build: a plain anchor (there is no client router to hand over to). */
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) {
  const { prefetch, ...anchor } = props
  void prefetch // next/link's prop: there is no router to prefetch with here, and it must not reach the DOM
  return <a {...anchor} />
}
