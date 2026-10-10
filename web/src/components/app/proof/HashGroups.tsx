import { Fragment } from 'react'

/**
 * A hash or address split into groups of four characters, so it wraps between groups and never inside one. The space
 * between groups sits outside the no-wrap spans: that space is where the line may break.
 */
export function HashGroups({ value }: { value: string }) {
  const groups = value.match(/.{1,4}/g) ?? []
  return (
    <span className="break-words">
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className="whitespace-nowrap">{group}</span>
        </Fragment>
      ))}
    </span>
  )
}
