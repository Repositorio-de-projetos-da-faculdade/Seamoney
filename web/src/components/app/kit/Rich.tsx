import { Fragment } from 'react'

/** Copy with *starred* words, which titles set in the italic serif (see .desk-display em). */
export function Rich({ text }: { text: string }) {
  return text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>))
}
