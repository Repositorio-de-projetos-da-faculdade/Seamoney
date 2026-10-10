// Random identifiers of the demo: the opaque order reference (the memo) and stand-ins for addresses and hashes.
// `rand` returns a number in [0, 1); the seed passes a deterministic one, the store passes crypto randomness.

export type Rand = () => number

// Crockford base32 without the letters that read like digits (I, L, O, U)
const REF_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const pick = (alphabet: string, length: number, rand: Rand) => Array.from({ length }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('')

/** "SM-7K3QX9PA": 11 bytes, well inside the 32-byte memo, and says nothing about the invoice, supplier or amount. */
export const orderReference = (rand: Rand) => `SM-${pick(REF_ALPHABET, 8, rand)}`

export const hex = (bytes: number, rand: Rand) => '0x' + pick('0123456789abcdef', bytes * 2, rand)

/** A Solana-looking public key (44 characters) or signature (88). Invented, never a real account. */
export const base58 = (length: number, rand: Rand) => pick(BASE58, length, rand)

export const cryptoRand: Rand = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}
