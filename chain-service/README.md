# chain-service (Python, FastAPI + pytempo)

Everything that touches the Tempo blockchain. **Stateless**: it stores no orders; the Java `rules-api` is its only caller.
**Testnet only** (Moderato, chain id 42431). It holds the key of the wallet that plays the "authorized partner".

| File | Responsibility |
|---|---|
| `app/memo.py` | 32-byte memo encoding (bytes, not characters) and event-topic helpers. Pure, tested. |
| `app/chain.py` | `ChainService`: `send_payment` (TIP-20 `transferWithMemo` in a `TempoTransaction`, one at a time under a lock, tops up from the faucet when low), `find_transfers` (indexed `TransferWithMemo` event by recipient + memo), `transaction_info`. |
| `app/main.py` | HTTP API: `POST /payments`, `GET /transfers`, `GET /transactions/{hash}`, `GET /health`. Optional shared secret via `X-Internal-Token`. |

## Run and test

```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m scripts.setup_wallets                        # creates + funds a testnet wallet in .env
uvicorn app.main:app --port 8000 --env-file .env       # interactive docs at http://localhost:8000/docs
pytest -q                                              # offline tests (fake chain)
python -m scripts.smoke                                # REAL testnet: pay with memo, find it by memo
```

Amounts are USD cents on the API; token base units (6 decimals) are returned as **strings** because they exceed JavaScript's safe integer range.
