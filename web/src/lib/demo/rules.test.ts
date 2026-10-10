import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  approvalHash,
  approvePayment,
  approveWallet,
  cancelPayment,
  changeRole,
  claimSend,
  completeSend,
  createPayment,
  DemoRuleError,
  proposeWallet,
  reconcilePayment,
  rejectPayment,
  requestReapproval,
  type NewPayment,
} from './rules.ts'
import { buildSeed } from './seed.ts'
import type { DemoState, Reconciliation } from './types.ts'

const NOW = Date.UTC(2026, 9, 10, 15)
const at = new Date(NOW).toISOString()
const seed = () => buildSeed(NOW)
const TEMPO_WALLET = '0x' + '1'.repeat(40)

const expectCode = (fn: () => unknown, code: string) =>
  assert.throws(fn, (e: unknown) => e instanceof DemoRuleError && e.code === code, `expected ${code}`)

const input = (usd: number, patch: Partial<NewPayment> = {}): NewPayment => ({
  supplierId: 'sup_shenzhen',
  network: 'tempo',
  invoiceNumber: 'INV-TEST-1',
  amountCents: usd * 100,
  dueDate: '2026-10-30',
  source: 'manual',
  invoiceFilename: null,
  reviewed: true,
  ...patch,
})

function newPayment(state: DemoState, usd: number, by = 'mem_julia', patch: Partial<NewPayment> = {}) {
  return createPayment(state, input(usd, patch), by, at, 'pay_test', 'SM-TEST0001')
}

const passed = (cents: number): Reconciliation => ({
  matchedAt: at,
  checks: { token: true, recipient: true, amount: true, memo: true, receipt: true },
  expectedCents: cents,
  paidCents: cents,
})

test('every seeded approval still matches its data, so seeded payments can be sent', () => {
  const s = seed()
  for (const p of s.payments.filter((x) => x.approval && !x.settlement)) assert.equal(p.approval!.dataHash, approvalHash(s, p), p.id)
})

test('large payments wait for a second person; small ones are approved by the policy', () => {
  const big = newPayment(seed(), 50_000).payments[0]
  assert.equal(big.status, 'pending_approval')
  const small = newPayment(seed(), 900).payments[0]
  assert.equal(small.status, 'approved')
  assert.equal(small.approval?.auto, true)
})

test('whoever created a payment cannot approve it, and only approvers or owners can', () => {
  const s = newPayment(seed(), 50_000, 'mem_marina')
  expectCode(() => approvePayment(s, 'pay_test', 'mem_marina', at), 'own_payment')
  expectCode(() => approvePayment(s, 'pay_test', 'mem_julia', at), 'role')
  expectCode(() => approvePayment(s, 'pay_test', 'mem_carlos', at), 'role')
  assert.equal(approvePayment(s, 'pay_test', 'mem_rafael', at).payments[0].status, 'approved')
})

test('roles follow the plan: operators create but do not send, accountants do neither', () => {
  expectCode(() => newPayment(seed(), 500, 'mem_carlos'), 'role')
  const s = newPayment(seed(), 500)
  expectCode(() => claimSend(s, 'pay_test', 'mem_julia', at), 'role')
  expectCode(() => claimSend(s, 'pay_test', 'mem_carlos', at), 'role')
  assert.equal(claimSend(s, 'pay_test', 'mem_rafael', at).payments[0].status, 'sending')
})

test('one active order per invoice, and an AI-read invoice needs a person to review it', () => {
  const s = newPayment(seed(), 500)
  expectCode(() => createPayment(s, input(700, { invoiceNumber: 'inv-test-1' }), 'mem_julia', at, 'pay_2', 'SM-TEST0002'), 'duplicate_invoice')
  const cancelled = cancelPayment(s, 'pay_test', 'mem_julia', at, 'typo')
  assert.equal(createPayment(cancelled, input(700), 'mem_julia', at, 'pay_2', 'SM-TEST0002').payments[0].status, 'approved')
  expectCode(() => newPayment(seed(), 500, 'mem_julia', { source: 'ai', reviewed: false }), 'not_reviewed')
})

test('a supplier can only be paid on a network where it has an approved wallet', () => {
  expectCode(() => newPayment(seed(), 500, 'mem_julia', { network: 'solana' }), 'no_wallet')
  expectCode(() => newPayment(seed(), 500, 'mem_julia', { supplierId: 'sup_ningbo' }), 'no_wallet')
})

test('a new wallet needs a second person, and approving it voids approvals made for the old one', () => {
  let s = approvePayment(newPayment(seed(), 50_000), 'pay_test', 'mem_rafael', at)
  s = proposeWallet(s, 'sup_shenzhen', 'tempo', TEMPO_WALLET, 'mem_julia', at, 'wal_new')
  // a proposal changes nothing yet
  assert.equal(claimSend(s, 'pay_test', 'mem_rafael', at).payments[0].status, 'sending')
  expectCode(() => approveWallet(s, 'sup_shenzhen', 'wal_new', 'mem_julia', at), 'role')
  s = proposeWallet(s, 'sup_shenzhen', 'tempo', TEMPO_WALLET.replace(/1$/, '2'), 'mem_rafael', at, 'wal_own')
  expectCode(() => approveWallet(s, 'sup_shenzhen', 'wal_own', 'mem_rafael', at), 'own_wallet')
  s = approveWallet(s, 'sup_shenzhen', 'wal_own', 'mem_marina', at)
  expectCode(() => claimSend(s, 'pay_test', 'mem_rafael', at), 'hash_mismatch')
  // the way out is a fresh approval of the new data
  s = requestReapproval(s, 'pay_test', 'mem_julia', at)
  assert.equal(s.payments[0].status, 'pending_approval')
  s = approvePayment(s, 'pay_test', 'mem_rafael', at)
  assert.equal(claimSend(s, 'pay_test', 'mem_rafael', at).payments[0].status, 'sending')
})

test('wallet addresses are checked per network', () => {
  expectCode(() => proposeWallet(seed(), 'sup_shenzhen', 'solana', TEMPO_WALLET, 'mem_julia', at, 'w'), 'invalid_wallet')
  expectCode(() => proposeWallet(seed(), 'sup_shenzhen', 'tempo', '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', 'mem_julia', at, 'w'), 'invalid_wallet')
})

test('a payment can be claimed for sending only once', () => {
  const s = claimSend(newPayment(seed(), 500), 'pay_test', 'mem_rafael', at)
  assert.equal(s.payments[0].status, 'sending')
  expectCode(() => claimSend(s, 'pay_test', 'mem_rafael', at), 'bad_state')
  expectCode(() => claimSend(s, 'pay_test', 'mem_marina', at), 'bad_state')
  const settlement = { mode: 'simulated' as const, network: 'tempo' as const, walletId: 'wal_001', txHash: '0x01', blockNumber: 1, logIndex: 0, confirmMs: 1500, paidAt: at }
  const sent = completeSend(s, 'pay_test', settlement)
  expectCode(() => claimSend(sent, 'pay_test', 'mem_rafael', at), 'bad_state')
  expectCode(() => cancelPayment(sent, 'pay_test', 'mem_marina', at, 'too late'), 'bad_state')
})

test('a failed check opens a review case instead of closing the invoice', () => {
  let s = claimSend(newPayment(seed(), 500), 'pay_test', 'mem_rafael', at)
  s = completeSend(s, 'pay_test', { mode: 'simulated', network: 'tempo', walletId: 'wal_001', txHash: '0x01', blockNumber: 1, logIndex: 0, confirmMs: 1500, paidAt: at })
  const short = { ...passed(50_000), paidCents: 49_000, checks: { ...passed(0).checks, amount: false } }
  assert.equal(reconcilePayment(s, 'pay_test', short, null).payments[0].status, 'in_review')
  assert.equal(reconcilePayment(s, 'pay_test', passed(50_000), null).payments[0].status, 'reconciled')
})

test('a rejected payment cannot be approved afterwards', () => {
  const s = rejectPayment(newPayment(seed(), 50_000), 'pay_test', 'mem_rafael', at, 'Wrong amount')
  assert.equal(s.payments[0].status, 'rejected')
  expectCode(() => approvePayment(s, 'pay_test', 'mem_marina', at), 'bad_state')
})

test('the last owner cannot be demoted', () => {
  expectCode(() => changeRole(seed(), 'mem_marina', 'operator', 'mem_marina', at), 'last_owner')
})
