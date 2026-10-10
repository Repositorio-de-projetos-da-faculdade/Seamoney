// Mirror of chain-service/app/memo.py for display only: a payment reference becomes a 32-byte memo,
// UTF-8 encoded and right-padded with zeros. The chain service stays the source of truth.
// No imports on purpose: this file is unit-tested directly by `node --test`.

export const MEMO_SIZE = 32

export interface MemoByte {
  /** Two lowercase hex digits. */
  hex: string
  /** The character this byte starts, or null for padding and for the trailing bytes of a multi-byte character. */
  char: string | null
  padding: boolean
}

export interface Memo {
  bytes: MemoByte[]
  /** Bytes the reference needs. Above MEMO_SIZE the chain service rejects it. */
  used: number
  fits: boolean
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

export function encodeMemo(reference: string): Memo {
  const encoder = new TextEncoder()
  const bytes: MemoByte[] = []
  for (const char of reference) {
    encoder.encode(char).forEach((b, i) => bytes.push({ hex: hex2(b), char: i === 0 ? char : null, padding: false }))
  }
  const used = bytes.length
  while (bytes.length < MEMO_SIZE) bytes.push({ hex: '00', char: null, padding: true })
  return { bytes: bytes.slice(0, MEMO_SIZE), used, fits: used <= MEMO_SIZE }
}

export const memoHex = (memo: Memo) => '0x' + memo.bytes.map((b) => b.hex).join('')
