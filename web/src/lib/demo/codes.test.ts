import assert from 'node:assert/strict'
import { test } from 'node:test'
import { base58Encode, solanaAddress } from './codes.ts'

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// The rules service (Network.isValidAddress) only accepts a Solana address that decodes to exactly 32 bytes.
function decodedLength(s: string): number {
  let n = 0n
  for (const c of s) n = n * 58n + BigInt(ALPHABET.indexOf(c))
  let bytes = 0
  while (n > 0n) {
    n /= 256n
    bytes++
  }
  for (const c of s) {
    if (c !== '1') break
    bytes++
  }
  return bytes
}

test('seeded Solana wallets are real 32-byte public keys', () => {
  let x = 0.123
  const rand = () => (x = (x * 9301 + 0.49297) % 1)
  for (let i = 0; i < 200; i++) assert.equal(decodedLength(solanaAddress(rand)), 32)
})

test('base58 keeps leading zero bytes as ones', () => {
  assert.equal(base58Encode(new Uint8Array([0, 0, 1])), '112')
  assert.equal(base58Encode(new Uint8Array(32)), '1'.repeat(32))
})
