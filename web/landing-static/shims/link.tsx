import type { AnchorHTMLAttributes } from 'react'

/** Stand-in for next/link in the static build: a plain anchor (there is no client router to hand over to). */
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />
}
