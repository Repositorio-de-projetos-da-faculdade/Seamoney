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

/** A Solana-looking signature (88 characters) for simulated transfers. Invented, never a real one. */
export const base58 = (length: number, rand: Rand) => pick(BASE58, length, rand)

/** Base58 of raw bytes, as Solana writes public keys (leading zero bytes become '1'). */
export function base58Encode(bytes: Uint8Array): string {
  let n = 0n
  for (const b of bytes) n = n * 256n + BigInt(b)
  let out = ''
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out
    n /= 58n
  }
  for (const b of bytes) {
    if (b !== 0) break
    out = '1' + out
  }
  return out
}

/**
 * A valid Solana public key: 32 random bytes in base58, so the rules service and the devnet accept it as a recipient.
 * Nobody holds its private key; test tokens sent to it simply stay there.
 */
export const solanaAddress = (rand: Rand) => base58Encode(Uint8Array.from({ length: 32 }, () => Math.floor(rand() * 256)))

export const cryptoRand: Rand = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}
