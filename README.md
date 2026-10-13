# Seamoney

Prototype for Brazilian small and medium-sized importers to manage supplier invoices, estimate payment costs, and reconcile testnet stablecoin payments.

Built for Colosseum's Crypto World's Fair 2026.

## Project status

Working prototype. Every item of the planned MVP below runs end to end on the Tempo testnet: cost calculator, invoice upload with AI-assisted reading (demo mode without an API key), payment order, simulated exchange quote, testnet payment with the order reference in the memo, automatic reconciliation, supplier receipt page and CSV report.

The **SaaS demo** at `/app` shows the product with roles, approvals, reconciliation and reports on fictitious data. Its offline mode needs no backend. With the Docker stack running, signing in at `/app/login` connects it to the rules API, so orders, approvals and payments run on the Tempo and Solana testnets, and the operator and the approver can use different computers. See "SaaS demo" in [docs/prototype.md](docs/prototype.md).

Architecture, how to run each service, configuration, deployment options and hackathon disclosures are in [docs/prototype.md](docs/prototype.md). Remaining work is tracked through GitHub Issues and the Seamoney - MVP project board.

## The problem

Importers need to connect international supplier payments with invoices, track payment status, and organize records for accounting review.

We are investigating whether a stablecoin-based payment workflow can reduce costs and simplify reconciliation for this audience.

Cost savings, supplier acceptance, and the commercial payment route remain hypotheses to validate.

## MVP

1. Estimate payment costs using explicit, editable assumptions.
2. Register a supplier invoice and create a payment order.
3. Display a simulated exchange quote.
4. Send a testnet token payment on Tempo with a unique order reference.
5. Verify the confirmed transfer against the expected payment.
6. Reconcile the order or flag a discrepancy.
7. Display a payment receipt and export a CSV report.

Invoice registration starts from an uploaded file whose fields are read by AI (optional) and must always be reviewed and editable by the user.

## Demo boundaries

- Blockchain transfers use testnets only (Tempo Moderato and Solana devnet) and test assets.
- BRL exchange quotes and partner operations are simulated.
- No real money is processed in the MVP.
- No exchange-provider partnership is currently claimed.
- Estimated savings are not live quotes or verified savings.
- Payment records support accounting review; they do not replace accounting or regulatory documentation.

A production payment route requires partner integration and validation of the applicable requirements.

## Technology

Three services, each owned by one workstream:

| Folder | Stack | Responsibility |
|---|---|---|
| [`web/`](web) | TypeScript, Next.js, Tailwind | Interface (English and Portuguese) and AI invoice reading |
| [`rules-api/`](rules-api) | Java 21, Spring Boot, PostgreSQL (Flyway) | Business rules: pricing, order status, reconciliation decisions, reports, sign-in and company isolation |
| [`chain-service/`](chain-service) | Python 3.12, FastAPI, pytempo | Tempo testnet: send payments with a memo, find transfers, read transactions |

The rules-api stores its data in PostgreSQL, with schema versions managed by Flyway (`rules-api/src/main/resources/db/migration`). Hosting: to be selected by the team (options in [docs/prototype.md](docs/prototype.md)).

**Update (Phase B1):** The rules-api is a backend with PostgreSQL (via Flyway), JWT sign-in, multi-company isolation (every order query is filtered by the company of the token), and audit logging. **Update (approvals):** orders at or above US$ 10,000 (`APPROVAL_THRESHOLD_CENTS`) wait for approval by a second person, never the creator; every order records who created, approved, rejected or cancelled it. See [docs/backend-api.md](docs/backend-api.md) for the API contract.

## Team workstreams

### A - Blockchain

Label: `A-blockchain`

- Configure the testnet wallet and token.
- Send payments with order references.
- Monitor confirmed transfers.
- Provide normalized transfer data to the reconciliation module.
- Implement the simulated exchange-quote adapter.

### B - Business logic

Label: `B-negocio`

- Define invoice, order, and payment data.
- Implement the database and APIs.
- Control order status transitions.
- Validate and reconcile payments.
- Detect discrepancies and prevent duplicate processing.
- Calculate estimated costs and export CSV reports.

### C - User interface

Label: `C-interface`

- Build the landing page and calculator.
- Build invoice and payment-order forms.
- Display orders and their status.
- Build the payment receipt page.
- Handle loading, empty states, errors, and simulation notices.

### D - Infrastructure and market

Label: `D-infra-mercado`

- Bootstrap the application and document local setup.
- Configure deployment and coordinate integration.
- Verify the complete demo flow.
- Coordinate customer interviews and partner research.
- Prepare the pitch, demo video, and submission.

## Task priorities

- `prioridade-mvp`: required for the core demonstration.
- `opcional`: implement after the core workflow is working.

## How to contribute

1. Choose an available Issue and assign yourself.
2. Move it to In Progress when work begins.
3. Create a branch for the task, such as `feat/3-testnet-payment`.
4. Implement the task and verify its acceptance criteria.
5. Open a pull request and link the Issue.
6. Request review from another team member.
7. Merge after review and mark the task Done.

Each Issue should have one primary owner. Other members may help.

Coordinate shared interfaces before changing data used by another module.

## Local development

Requirements: Docker with Compose (simplest), or JDK 21 + Maven, Python 3.12 and Node 24 to run the services separately.

```bash
cp .env.example .env     # set TEMPO_PARTNER_PRIVATE_KEY: a TESTNET key only
docker compose up --build
# open http://localhost:3000
```

To create and fund a testnet wallet, and for the per-service commands, environment variables and tests, see [docs/prototype.md](docs/prototype.md). To verify the whole flow against the real testnet after starting the stack:

```bash
node scripts/e2e.mjs http://localhost:3000 tempo   # or: solana
```

The script creates an order of US$ 80,000 as an operator (above the approval threshold, so it waits in `pending_approval`; the operator may neither approve nor pay: 403). Paying before approval gets 409. An approver then approves (the approval hash is shown) and pays; a second payment gets 409. It reconciles with all five checks, and confirms that a user from another company cannot see the order. If the demo password gate is on, set `DEMO_SESSION_SECRET` for the script.

### Sign in

Sign in at `http://localhost:3000/app/login` (the old `/login` and `/dashboard` pages were removed; they redirect to `/app`). With the Docker stack running, a real sign-in comes first: it seats you as the workspace member with the same role and switches settlement to the Tempo Moderato and Solana devnet testnets. Below it is an offline demo, where you pick a person and settlement is simulated in the browser. The public supplier proof of a testnet payment is at `/proof/<proof id>`, a link signed by the rules service (an order id alone opens nothing). The demo accounts are fictitious, every one uses the password `demo123`, and they are created only when the database is empty and the `demo` profile is active (the docker compose default; `SEED_DEMO=false` turns it off):

- Porto Claro Importadora: `porto.owner@example.com`, `porto.approver@example.com`, `porto.operator@example.com`, `porto.accountant@example.com`
- Acme Corp: `acme.owner@example.com`, `acme.approver@example.com`, `acme.operator@example.com`, `acme.accountant@example.com`

`JWT_SECRET` is required (32 characters or more); the rules-api does not start without a valid one. Sessions last one hour. For any deployment that other people can reach: set `DEMO_ACCESS_PASSWORD` (a strong one) and `DEMO_SESSION_SECRET` to put a password gate in front of the app, put HTTPS in front of it (the session cookies are Secure only when the request arrives as HTTPS, so a demo served over plain HTTP cannot sign in), change `CHAIN_SERVICE_TOKEN` and `DB_PASSWORD`, and never publish ports 8080 or 8000. See [docs/backend-api.md](docs/backend-api.md) for the roles.

To work on the interface without the other services: `node web/scripts/mock-rules.mjs`, then `cd web && RULES_API_URL=http://localhost:8089 npm run dev`.

Do not commit API credentials, wallet private keys, seed phrases, database passwords, or real customer invoices.

`.env.example` files contain configuration names and placeholder values only.

## Reconciliation acceptance criteria

- A matching confirmed payment reconciles the order.
- An incorrect amount, token, or recipient does not reconcile it.
- An unrelated or missing reference does not reconcile it.
- Processing the same transfer again does not duplicate the payment.
- Testnet receipts are clearly identified as test payments.

These cases are covered by automated tests in `rules-api` (`OrderApiTest`; 42 Java tests in total) and exercised against the real testnet by `scripts/e2e.mjs`.

## License

A license has not yet been selected. The team will decide before submission.
