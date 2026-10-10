# Seamoney

Prototype for Brazilian small and medium-sized importers to manage supplier invoices, estimate payment costs, and reconcile testnet stablecoin payments.

Built for Colosseum's Crypto World's Fair 2026.

## Project status

Working prototype. Every item of the planned MVP below runs end to end on the Tempo testnet: cost calculator, invoice upload with AI-assisted reading (demo mode without an API key), payment order, simulated exchange quote, testnet payment with the order reference in the memo, automatic reconciliation, supplier receipt page and CSV report.

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

- Blockchain transfers use Tempo testnet and test assets.
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
| [`rules-api/`](rules-api) | Java 21, Spring Boot, SQLite | Business rules: pricing, order status, reconciliation decisions, reports |
| [`chain-service/`](chain-service) | Python 3.12, FastAPI, pytempo | Tempo testnet: send payments with a memo, find transfers, read transactions |

The prototype stores data in a SQLite file. PostgreSQL is the planned database for the next phase. Hosting: to be selected by the team (options in [docs/prototype.md](docs/prototype.md)).

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
node scripts/e2e.mjs
```

To work on the interface without the other services: `node web/scripts/mock-rules.mjs`, then `cd web && RULES_API_URL=http://localhost:8089 npm run dev`.

Do not commit API credentials, wallet private keys, seed phrases, database passwords, or real customer invoices.

`.env.example` files contain configuration names and placeholder values only.

## Reconciliation acceptance criteria

- A matching confirmed payment reconciles the order.
- An incorrect amount, token, or recipient does not reconcile it.
- An unrelated or missing reference does not reconcile it.
- Processing the same transfer again does not duplicate the payment.
- Testnet receipts are clearly identified as test payments.

These cases are covered by automated tests in `rules-api` (`OrderApiTest`) and exercised against the real testnet by `scripts/e2e.mjs`.

## License

A license has not yet been selected. The team will decide before submission.
