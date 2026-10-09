# Seamoney

Prototype for Brazilian small and medium-sized importers to manage supplier invoices, estimate payment costs, and reconcile testnet stablecoin payments.

Built for Colosseum's Crypto World's Fair 2026.

## Project status

Early development. The repository currently contains the project documentation and task backlog.

Features listed below describe the planned MVP. Implementation progress is tracked through GitHub Issues and the Seamoney - MVP project board.

## The problem

Importers need to connect international supplier payments with invoices, track payment status, and organize records for accounting review.

We are investigating whether a stablecoin-based payment workflow can reduce costs and simplify reconciliation for this audience.

Cost savings, supplier acceptance, and the commercial payment route remain hypotheses to validate.

## Planned MVP

1. Estimate payment costs using explicit, editable assumptions.
2. Register a supplier invoice and create a payment order.
3. Display a simulated exchange quote.
4. Send a testnet token payment on Tempo with a unique order reference.
5. Verify the confirmed transfer against the expected payment.
6. Reconcile the order or flag a discrepancy.
7. Display a payment receipt and export a CSV report.

Invoice registration will initially be manual. AI-assisted extraction is optional and must allow user review.

## Demo boundaries

- Blockchain transfers use Tempo testnet and test assets.
- BRL exchange quotes and partner operations are simulated.
- No real money is processed in the MVP.
- No exchange-provider partnership is currently claimed.
- Estimated savings are not live quotes or verified savings.
- Payment records support accounting review; they do not replace accounting or regulatory documentation.

A production payment route requires partner integration and validation of the applicable requirements.

## Planned technology

- TypeScript
- Next.js
- PostgreSQL
- Tempo testnet
- Hosting: to be selected by the team

AI invoice extraction may be added after the core workflow works.

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

Start with:

- Define shared invoice, order and payment data.
- Bootstrap application and development instructions.

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

Application setup is pending.

The bootstrap task must document:

- Required runtime versions.
- Dependency installation.
- Environment variables.
- Database setup.
- Commands to run and verify the application.

Do not commit API credentials, wallet private keys, seed phrases, database passwords, or real customer invoices.

Provide an `.env.example` with configuration names and placeholder values only.

## Reconciliation acceptance criteria

- A matching confirmed payment reconciles the order.
- An incorrect amount, token, or recipient does not reconcile it.
- An unrelated or missing reference does not reconcile it.
- Processing the same transfer again does not duplicate the payment.
- Testnet receipts are clearly identified as test payments.

## License

A license has not yet been selected. The team will decide before submission.
