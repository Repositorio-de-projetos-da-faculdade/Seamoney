# Seamoney prototype: architecture, run, deploy and disclosures

Pay import invoices to suppliers in Asia with **stablecoins**: lower fees, settlement in seconds, and **automatic reconciliation** because every payment carries an opaque order reference in its memo. The invoice number never goes on-chain.

Built for the Colosseum **Crypto World's Fair** hackathon (Tempo track). Brazilian SME importers are the first target customer.

> **Demo status: read this first.** Everything on-chain runs on the **Tempo Moderato testnet** with test tokens. The reais-to-dollar leg, which in a real product is done by a licensed partner, is **simulated** and labelled as such in the UI. No real money moves. Fee figures are estimates, not quotes, and taxes such as IOF are not included.

## Architecture: three services

| Service | Language | Owns |
|---|---|---|
| [`web/`](../web) | TypeScript, Next.js | The interface (landing, calculator, the `/app` workspace, supplier proof page) and AI invoice reading. No database, no keys. |
| [`rules-api/`](../rules-api) | **Java 21**, Spring Boot | **Business rules**: pricing and savings, order lifecycle, atomic pay claim, reconciliation decisions, reports, leads, JWT sign-in with company isolation, persistence (PostgreSQL, schema versioned with Flyway). |
| [`chain-service/`](../chain-service) | **Python 3.12**, FastAPI, pytempo | **Blockchain**: sends the payment with a 32-byte memo, finds transfers by memo, reads transactions. Stateless. Holds the testnet key. |

```
Browser ──> web (Next.js) ──> rules-api (Java) ──> chain-service (Python) ──> Tempo testnet
              UI + /api proxy    rules + PostgreSQL   pytempo + web3
```

Only `web` is published by `docker-compose.yml`. The Java service is the only caller of the Python service and authenticates with a shared `X-Internal-Token`.

## What is real and what is simulated

| Part | Status |
|---|---|
| Stablecoin payment with the opaque order reference as the 32-byte memo on Tempo | **Real** (testnet), confirmed in about 1-2 seconds |
| Reconciliation: find the payment by memo, then check token, recipient, amount, memo and receipt | **Real**, read from the chain, not from our own records |
| Duplicate protection: a transfer credits only one order, and a paid order cannot be paid twice | **Real**, covered by tests |
| Proof-of-payment page for the supplier, verified live on-chain | **Real** |
| Invoice reading by AI | **Real** when `ANTHROPIC_API_KEY` is set; otherwise **demo mode**, clearly labelled |
| BRL to USD conversion by an authorized partner | **Simulated** (no partner integration exists yet) |
| Offline demo data on a fresh browser | **Demo data**, flagged with a "Demo" tag |
| Authentication | **JWT sign-in** (HS256, one-hour sessions) with fictitious demo accounts; every order query is filtered by the token's company. An optional password gate (`DEMO_ACCESS_PASSWORD`) can sit in front of the web app. |

Regulatory note: Brazil's central bank Resolution BCB 561 (in force since 2026-10-01) prohibits virtual assets in settlement between an eFX provider and its foreign counterparty. Whether a software layer plus an authorized partner can route an importer's payment this way must be confirmed with a lawyer or the partner before any real use. This repository does not move or convert real funds.

## SaaS demo (`/app`)

A browser-only version of the product for demos and judging. It needs no Java, Python, Docker or keys: every visitor gets a private sandbox with a fictitious importer (Porto Claro Importadora), four people with different roles, six suppliers and seven months of payments, stored in their own browser.

What it shows, following the team's backend plan: role-based permissions (owner, approver, operator, accountant, switched from the night rail that opens on hover or keyboard focus; operators create orders and propose wallets but do not send), supplier wallets versioned per network (Tempo or Solana) that a second person approves, one active order per invoice, AI-read invoices that a person must confirm, approval by someone other than the creator bound to a SHA-256 of the payment data (approve a new wallet and the payment needs approval again), an opaque order reference as the memo (never the invoice number), a single atomic claim before sending, automatic reconciliation with five checks that opens a review case when one fails, cancellation before sending, the supplier's proof, CSV export, the audit trail, team and settings.

| Part | Status |
|---|---|
| Business data (company, people, suppliers, payments) | **Fictitious**, labelled on every screen |
| Fee, savings and BRL figures | Same integer-cent rules as the Java `Pricing` (tested); BRL **simulated** |
| Transfer, by default | **Simulated**: a random hash, labelled, with no explorer link |
| Transfer with Settings > Tempo testnet | **Real testnet** payment through the Java and Python services (needs `docker compose up`), with the opaque reference as memo |
| Payments on Solana | With sign-in at `/app/login` (Docker stack running), a **real Solana devnet** payment through the Java and Python services; in the offline demo, always **simulated** |

Code: data and rules in `web/src/lib/demo/`, chart geometry in `web/src/lib/chart/`, UI in `web/src/components/app/`. The chart coastline comes from Natural Earth 1:50m (public domain) and is regenerated with `node web/scripts/build-chart.mjs`.

## Run everything with Docker

```bash
cp .env.example .env     # set TEMPO_PARTNER_PRIVATE_KEY (testnet key; see below)
docker compose up --build
# open http://localhost:3000
```

Create and fund a testnet partner wallet once (writes `chain-service/.env`, never prints the key):

```bash
cd chain-service
python -m venv .venv && .venv/Scripts/activate      # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
python -m scripts.setup_wallets
```

Then copy that `TEMPO_PARTNER_PRIVATE_KEY=` line into the root `.env`.

## Run services separately (development)

```bash
# 1) chain-service on :8000
cd chain-service && uvicorn app.main:app --port 8000 --env-file .env

# 2) rules-api on :8080  (needs JDK 21 and Maven; CHAIN_SERVICE_URL defaults to http://localhost:8000)
cd rules-api && mvn spring-boot:run

# 3) web on :3000  (RULES_API_URL defaults to http://localhost:8080)
cd web && npm install && npm run dev
```

## Interface and brand

The look follows the team's mockup: deep navy, teal and mint accents, green actions. Typography is **Plus Jakarta Sans** (headings, numbers, buttons) and **Inter** (text), both bundled with `@fontsource-variable/*`, so nothing is fetched from a font CDN at runtime.

| Piece | Where |
|---|---|
| Colours, fonts, radii, shadows, animations | `web/src/app/globals.css` (`@theme` tokens) |
| Logo and slogan | The logo is traced from the files supplied by the team into vector paths (`web/src/lib/brand-paths.ts`, drawn by `Logo` and `LogoMark` in `web/src/components/ui.tsx`), so it stays sharp at any size and works on dark and light backgrounds. SVG exports are in `web/public/brand/`. Slogan and pitch are in `web/src/lib/i18n/dict.ts` (`brand.*`). |
| Ship imagery | `web/src/components/ShipScene.tsx`: a hand-built vector scene of a container ship (with the Seamoney mark on its funnel), quay cranes, a distant port and the reflection on the water. It replaces photography so the repo has no image licences to track. To use real photos, replace the `ShipScene` usages with `next/image` and keep the dark gradient overlays for legibility. |
| Favicon, app icon, share image | `web/src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, `opengraph-image.png` |
| Landing page sections | `web/src/app/page.tsx` and `web/src/components/landing/*` |
| Workspace shell | `/app`: night rail and top bar in `web/src/components/app/shell`. The old `/dashboard/*` prototype was removed: `next.config.ts` redirects `/dashboard/*` to `/app`, and `/login` to `/app/login` |

Work on the interface without Java, Python or Docker: `node web/scripts/mock-rules.mjs` starts a stand-in for the rules API with the same JSON shapes (port 8089), then `cd web && RULES_API_URL=http://localhost:8089 npm run dev`. It is for UI work only, never for demos.

## Tests

```bash
cd web && npm run typecheck && npm run lint && npm test       # web: 39 tests (UI input parsing, demo rules and reports)
cd rules-api && mvn verify                                    # Java: 42 tests; or: docker build --target test ./rules-api
cd chain-service && pytest -q                                 # Python: 34 offline contract tests
cd chain-service && python -m scripts.smoke                   # REAL testnet: pay with memo, find it by memo
```

The Java suite (H2 in PostgreSQL mode) covers the money rules and the whole order flow against a fake chain: quote, pay, double-pay blocked, approval by a second person (creator blocked, threshold, pay before approval blocked), rejection with a reason, cancellation before sending, approval hash mismatch blocks payment, failed payment and retry, reconciliation match, wrong amount, missing transfer, transfer replay across orders, input validation, CSV, leads consent, sign-in and company isolation.

## Configuration

| Variable | Service | Purpose |
|---|---|---|
| `TEMPO_PARTNER_PRIVATE_KEY` | chain-service | Testnet wallet that plays the authorized partner. Secret. Never use a key that holds real funds. |
| `TEMPO_RPC_URL`, `TEMPO_GAS_LIMIT` | chain-service | RPC endpoint (default Moderato) and gas cap. |
| `SOLANA_PAYER_PRIVATE_KEY`, `SOLANA_RPC_URL` | chain-service | Optional. Solana payer key and RPC endpoint (default devnet). Secret for the key. |
| `CHAIN_SERVICE_TOKEN` | chain-service, rules-api | Shared secret for service-to-service calls. Change it for any shared deployment. |
| `CHAIN_SERVICE_URL` | rules-api | Where the Python service runs. |
| `JWT_SECRET` | rules-api | Required. Signs the HS256 sign-in tokens. 32 characters or more; the service does not start without a valid value. Secret. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | rules-api | PostgreSQL connection (defaults `localhost`, `5432`, `seamoney`, `postgres`, `postgres`; compose points `DB_HOST` at the `postgres` service). Schema is versioned with Flyway. Secret for the password. |
| `DEMO_USD_BRL` | rules-api | Simulated FX rate shown in quotes. |
| `SEED_DEMO` | rules-api | Creates the fictitious demo companies and accounts (`demo123`) when the database is empty. Compose default is `true`; `false` starts with an empty database. |
| `WEB_PORT` | docker compose | Host port for the web app (default `3000`). |
| `RULES_API_URL` | web | Where the Java service runs (read at request time). |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | web | Enables AI invoice reading. Optional. Secret. |
| `SITE_URL` | web | Public address (for example `https://seamoney.example`), used to build absolute links for the share image. Defaults to `http://localhost:3000`. |
| `DEMO_ACCESS_PASSWORD` | web | Optional. If set, blocks all pages and APIs behind a password wall. |
| `DEMO_SESSION_SECRET` | web | Secret used to sign the session cookie. Required if password is set. |

## API

Rules API (Java), reached by the browser through the web app's `/api/*` proxy:

| Method and path | What it does |
|---|---|
| `POST /api/compare` | Savings calculator: bank cost vs route fee |
| `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{id}` | Create and quote, list, detail with timeline |
| `POST /api/orders/{id}/pay` | Send the on-chain payment (atomic claim, cannot double-pay) |
| `POST /api/orders/{id}/reconcile` | Match the payment against the chain |
| `GET /api/stats`, `GET /api/proof/{id}`, `GET /api/reports/orders`, `POST /api/leads`, `GET /api/health` | Aggregate numbers for the home screen, supplier proof, CSV export, calculator leads (email only with consent), health |
| `POST /api/auth/login` | Sign in with email and password; returns a JWT. Five failed attempts lock the email for 15 minutes |
| `POST /api/auth/refresh`, `GET /api/auth/me` | Renew the token or switch company; current user, company and role |

The web app also has its own `/api/session` route (GET, POST, DELETE) that manages the optional demo password gate.

Chain service (Python), internal: `POST /payments` (send with an `Idempotency-Key` header; a reused key with a different body returns 409), `GET /payments/{key}` (look up a previous send; 404 if unknown), `GET /transfers`, `GET /transactions/{hash}`, `GET /health`. Interactive docs at `/docs` when run locally.

## Deploy: options for the team

The system is three services plus a PostgreSQL database, so any of these work; none has been exercised against a real cloud account yet.

1. **One VM with Docker Compose** (simplest and fastest): install Docker, clone the repo, create `.env`, `docker compose up -d --build`, and put HTTPS in front of port 3000 (Caddy, Traefik, or the provider's load balancer). Compose runs PostgreSQL in its own container.
2. **Container platform with a managed PostgreSQL**: deploy `web`, `rules-api` and `chain-service` as separate services, with only `web` exposed publicly. Point `rules-api` at the managed database through the `DB_*` variables. The team has not yet chosen a provider or written a recipe for one.
3. Any host that runs the three images needs the same settings listed in [Configuration](#configuration), in particular `JWT_SECRET`, `CHAIN_SERVICE_TOKEN` and the `DB_*` variables.

`.github/workflows/ci.yml` runs all tests, builds, and the three Docker images on every push. Deployment is intentionally not wired up until the team picks a host.

Security notes for a public deployment: the demo accounts (`demo123`, seeded only into an empty database) are public, so anyone who can reach the rules-api can sign in and trigger testnet payments from the partner wallet (it refills itself from the faucet). Set `DEMO_ACCESS_PASSWORD` or an allow-list in front of the web app, and set `SEED_DEMO=false` if the demo accounts should not exist. The Python and Java services must not be exposed publicly.

## Hackathon disclosures

- Built during the Crypto World's Fair period (2026-09-14 to 2026-10-12). Confirm before submitting that no pre-existing application code was reused, and declare any that was. Open-source libraries are listed in each service's dependency file.
- Built with AI coding assistance (Claude).
- The Tempo integration follows Tempo's public documentation: `pytempo` with a TIP-20 `transferWithMemo` call, and the indexed `TransferWithMemo` event to find a payment by memo.
