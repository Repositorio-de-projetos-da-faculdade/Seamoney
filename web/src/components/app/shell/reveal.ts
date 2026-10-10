// How the sidebar opens. The desktop column rests as a 72px rail and widens over the page while the pointer is on it,
// while something inside has keyboard focus, or while its person menu is open (an [aria-expanded=true] inside). The
// phone drawer sets data-drawer and is always open. Nothing moves when it opens: icons sit in a fixed 72px column,
// the column grows, and the words fade in once there is room for them.
//
// The class strings are written out whole so Tailwind can find them.

/** Root of the column: names the group the variants below listen to. */
export const SIDE_GROUP = 'group/side'

/** Text and details that only make sense open: hidden on the rail, faded in a moment after the column widens. */
export const REVEAL =
  'opacity-0 transition-opacity duration-150 ease-out group-hover/side:opacity-100 group-hover/side:delay-150 group-hover/side:duration-300 group-focus-within/side:opacity-100 group-has-[[aria-expanded=true]]/side:opacity-100 group-data-[drawer=true]/side:opacity-100 motion-reduce:transition-none'

/** The opposite: marks that only the rail needs (a count dot), gone once the words are there. */
export const RAIL_ONLY =
  'opacity-100 transition-opacity duration-150 group-hover/side:opacity-0 group-focus-within/side:opacity-0 group-has-[[aria-expanded=true]]/side:opacity-0 group-data-[drawer=true]/side:opacity-0 motion-reduce:transition-none'

/** The same soft curve for every width change, so the column and the button inside it move as one. */
export const EASE = 'duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'

/**
 * The column's own width (set on the group root itself, so plain hover/focus-within variants): 72px at rest, 248px
 * open. The opening waits a beat so a pointer passing by does not flash it; closing starts at once.
 */
export const COLUMN_WIDTH =
  'w-[72px] hover:w-[248px] hover:delay-100 focus-within:w-[248px] has-[[aria-expanded=true]]:w-[248px] data-[drawer=true]:w-full'

/** The New payment button: a 40px circle on the rail, a pill once open. */
export const BUTTON_WIDTH =
  'w-10 group-hover/side:w-[172px] group-hover/side:delay-100 group-focus-within/side:w-[172px] group-has-[[aria-expanded=true]]/side:w-[172px] group-data-[drawer=true]/side:w-[172px]'
