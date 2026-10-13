# rules-api (Java 21, Spring Boot)

The business rules of Seamoney. This service decides; it does not touch the blockchain directly (it asks the Python `chain-service`).

## What lives here

| Package | Responsibility |
|---|---|
| `domain/Pricing` | Pure money math in integer cents: route fee, bank-cost assumption, savings, USD cents to 6-decimal token units, simulated BRL. No framework code, fully unit-tested. |
| `service/OrderService` | The order lifecycle: **create and quote**, **pay** (atomic claim `quoted -> sending` so a double click cannot pay twice), **recover** (an order left in `sending` is settled from the chain, never by sending again), **reconcile** (see below), CSV report, leads. |
| `store/OrderRepository` | All SQL (JdbcTemplate on SQLite). |
| `chain/ChainClient` | The only thing the rules know about the blockchain: an interface. `HttpChainClient` calls the Python service; tests plug in `FakeChain`. |
| `service/DemoSeeder` | Demo history flagged `is_demo`, disabled with `SEED_DEMO=false`. |
| `web/*Controller` | REST API (see the root README) and one error format: `{"error": "...", "code": "..."}`. |

## Reconciliation rule

A paid order is closed only after an **independent** check: ask the chain for `TransferWithMemo` events to the supplier wallet carrying the order's reference, then verify token, recipient, amount, memo and receipt. A mismatch leaves the invoice open. A transfer (tx hash + log index) can credit only one order.

## Run and test

```bash
mvn spring-boot:run            # needs JDK 21 + Maven; CHAIN_SERVICE_URL defaults to http://localhost:8000
mvn verify                     # 27 tests
docker build --target test .   # same tests, no local JDK needed
```

Configuration is in `src/main/resources/application.yml` (`seamoney.*`), all overridable by environment variables.
