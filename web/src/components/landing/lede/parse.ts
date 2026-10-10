// Running copy on the landing is written with two marks: *stars* around the words that cross the sea (set in the
// italic serif, like the titles) and {glyph} where the thing the sentence names appears inline, e.g. the invoice
// number as a memo chip. This splits a line into the pieces the Lede component renders, keeping the source spacing.

export type Piece = { type: 'word'; text: string; em: boolean } | { type: 'space' } | { type: 'glyph'; name: string }

export function parseLede(text: string): Piece[] {
  const pieces: Piece[] = []
  text.split('*').forEach((part, i) => {
    for (const token of part.split(/(\{\w+\}|\s+)/)) {
      if (!token) continue
      if (/^\s+$/.test(token)) pieces.push({ type: 'space' })
      else if (/^\{\w+\}$/.test(token)) pieces.push({ type: 'glyph', name: token.slice(1, -1) })
      else pieces.push({ type: 'word', text: token, em: i % 2 === 1 })
    }
  })
  return pieces
}


export type Unit = Piece | { type: 'bound'; pieces: Piece[] }

/** Keeps each glyph on the line of the word before it, with the punctuation right after it, so none is left alone. */
export function bindGlyphs(pieces: Piece[]): Unit[] {
  const units: Unit[] = []
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    if (piece.type !== 'glyph') {
      units.push(piece)
      continue
    }
    const bound: Piece[] = []
    const [before, space] = units.slice(-2)
    if (space?.type === 'space' && before?.type === 'word') bound.push(...(units.splice(-2) as Piece[]))
    bound.push(piece)
    while (pieces[i + 1]?.type === 'word') bound.push(pieces[++i])
    units.push({ type: 'bound', pieces: bound })
  }
  return units
}
