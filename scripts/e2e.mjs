#!/usr/bin/env node
// End-to-end check of the whole stack against the real testnets:
//   docker compose up -d --build && node scripts/e2e.mjs [http://localhost:3000] [tempo|solana]
// It goes web -> rules-api (Java) -> chain-service (Python) -> blockchain, the one path the unit
// tests cannot cover (they use a fake chain). Needs Node 18+ only.
//
// It signs in like a person would (demo accounts of the seed, password demo123): the operator creates the order but
// may not pay it, the approver pays, and a user of another company cannot see it. With the demo password gate on,
// pass DEMO_SESSION_SECRET (the same value the web app uses) so the script can carry a valid gate cookie.
import { createHmac } from 'node:crypto'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const NETWORK = process.argv[3] ?? 'tempo'
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo123'
const invoice = `INV-E2E-${new Date().toTimeString().slice(0, 8).replaceAll(':', '')}`
if (NETWORK !== 'tempo' && NETWORK !== 'solana') {
  console.error(`Unknown network "${NETWORK}". Use tempo or solana.`)
  process.exit(2)
}
// A valid Tempo address nobody controls, so the test tokens just sit there. On Solana the rules service draws a
// throwaway supplier address itself when none is given.
const WALLET = NETWORK === 'tempo' ? '0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0' : undefined

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

function gateCookie() {
  const secret = process.env.DEMO_SESSION_SECRET
  if (!secret) return []
  const ts = Date.now()
  return [`seamoney_session=${ts}.${createHmac('sha256', secret).update(String(ts)).digest('hex')}`]
}

/** A browser-like client: keeps the cookies the web app sets (the httpOnly session among them). */
function client() {
  const jar = new Map(gateCookie().map((c) => c.split(/=(.*)/s).slice(0, 2)))
  const call = async (path, init = {}) => {
    const headers = { ...init.headers, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }
    const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' })
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';')
      const [name, value] = pair.split(/=(.*)/s)
      if (value) jar.set(name, value)
      else jar.delete(name)
    }
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    return { status: res.status, body }
  }
  const post = (path, data) =>
    call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
  return { call, post }
}

async function signIn(email) {
  const c = client()
  const res = await c.post('/api/session', { email, password: PASSWORD })
  if (res.status !== 200) fail(`sign-in as ${email} returned ${res.status}: ${JSON.stringify(res.body)}`)
  return c
}

const anon = client()
const health = await anon.call('/api/health')
if (health.status === 401) fail('the demo gate is on: set DEMO_SESSION_SECRET for this script')
console.log('health:     ', JSON.stringify(health.body.checks))
if (health.body.checks?.chainService !== 'ok') fail('the chain service is not reachable from the rules service')

const unauth = await anon.post('/api/orders', {})
if (unauth.status !== 401) fail(`creating an order without signing in returned ${unauth.status}, expected 401`)
console.log('no session: refused (HTTP 401)')

const operator = await signIn('porto.operator@example.com')
const created = await operator.post('/api/orders', {
  supplierName: 'Shenzhen Tech Co.',
  supplierCountry: 'CN',
  supplierWallet: WALLET,
  invoiceNumber: invoice,
  amountCents: 8_000_000,
  dueDate: '2026-10-25',
  extractionSource: 'demo',
  network: NETWORK,
})
if (created.status !== 201) fail(`create returned ${created.status}: ${JSON.stringify(created.body)}`)
const order = created.body.order
if (order.totalCents !== 8_080_000 || order.savingsCents !== 160_000) fail(`unexpected quote: ${JSON.stringify(order)}`)
if (!/^SM-[0-9A-Z]{8}$/.test(order.reference) || order.reference.includes(invoice)) fail(`the memo is not an opaque reference: ${order.reference}`)
console.log(`created:     ${order.id} on ${NETWORK}, memo ${order.reference} (invoice ${invoice} stays off-chain)`)

const operatorPays = await operator.post(`/api/orders/${order.id}/pay`)
if (operatorPays.status !== 403) fail(`the operator could pay (HTTP ${operatorPays.status})`)
console.log('operator:    may not pay (HTTP 403)')

const approver = await signIn('porto.approver@example.com')
const paid = await approver.post(`/api/orders/${order.id}/pay`)
if (paid.status !== 200 || paid.body.order.status !== 'sent') fail(`pay returned ${paid.status}: ${JSON.stringify(paid.body)}`)
console.log(`paid:        tx ${paid.body.order.txHash} confirmed in ${paid.body.order.confirmMs} ms`)

const again = await approver.post(`/api/orders/${order.id}/pay`)
if (again.status !== 409) fail(`a second payment was not blocked (HTTP ${again.status})`)
console.log('double pay:  blocked (HTTP 409)')

let rec
for (let attempt = 0; attempt < 6; attempt++) {
  rec = await approver.post(`/api/orders/${order.id}/reconcile`)
  if (rec.body.ok || rec.body.reason !== 'no_matching_transfer') break
  await new Promise((r) => setTimeout(r, 3_000)) // an RPC can lag a block or two behind the one that confirmed
}
if (!rec.body.ok) fail(`reconciliation failed: ${JSON.stringify(rec.body)}`)
const checks = rec.body.order.recon.checks
if (!Object.values(checks).every(Boolean)) fail(`a reconciliation check failed: ${JSON.stringify(checks)}`)
console.log('reconciled:  all 5 checks passed', JSON.stringify(checks))

const proof = await anon.call(`/api/proof/${order.id}`)
if (proof.body.tx?.status !== 'success') fail(`proof page data is not verified on-chain: ${JSON.stringify(proof.body)}`)
console.log('proof:       verified on-chain at', proof.body.tx.timestamp)

const csv = await approver.call('/api/reports/orders')
if (typeof csv.body !== 'string' || !csv.body.includes(order.reference)) fail('the CSV report does not list the new order')
console.log('report:      CSV lists the order')

const outsider = await signIn('acme.owner@example.com')
const peek = await outsider.call(`/api/orders/${order.id}`)
if (peek.status !== 404) fail(`another company could read the order (HTTP ${peek.status})`)
const theirCsv = await outsider.call('/api/reports/orders')
if (typeof theirCsv.body === 'string' && theirCsv.body.includes(order.reference)) fail("another company's CSV lists the order")
console.log('isolation:   another company sees neither the order nor it in its CSV')

console.log('OK')
