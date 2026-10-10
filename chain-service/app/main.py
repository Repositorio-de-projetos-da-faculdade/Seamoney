"""HTTP API of the chain service. Stateless: it never stores orders, it only talks to the blockchain.

The Java rules service is the only intended caller. When CHAIN_SERVICE_TOKEN is set, every call
(except /health) must send it in the X-Internal-Token header.
"""

from __future__ import annotations

import logging
import os
import secrets
from functools import lru_cache

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from .chain import ChainError, ChainNotConfigured, ChainService, DEFAULT_RPC

log = logging.getLogger("seamoney.chain")
app = FastAPI(title="Seamoney chain service", version="1.0.0")


@lru_cache
def get_service() -> ChainService:
    return ChainService(
        rpc_url=os.environ.get("TEMPO_RPC_URL", DEFAULT_RPC),
        private_key=os.environ.get("TEMPO_PARTNER_PRIVATE_KEY") or None,
        gas_limit=int(os.environ.get("TEMPO_GAS_LIMIT", "500000")),
    )


def require_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = os.environ.get("CHAIN_SERVICE_TOKEN")
    if expected and not secrets.compare_digest(x_internal_token or "", expected):
        raise HTTPException(status_code=401, detail="Missing or invalid internal token")


class PaymentIn(BaseModel):
    to: str
    amount_cents: int = Field(gt=0, le=100_000_000)  # US$ 1,000,000 cap on the demo
    reference: str = Field(min_length=1, max_length=64)


class PaymentOut(BaseModel):
    tx_hash: str
    block_number: int
    confirm_ms: int
    memo_hex: str
    from_address: str


class TransferOut(BaseModel):
    tx_hash: str
    log_index: int
    block_number: int
    from_address: str
    to_address: str
    amount_units: str  # string: token base units exceed JavaScript's safe integer range
    memo_hex: str


class TxOut(BaseModel):
    status: str
    block_number: int
    timestamp: str


@app.get("/health")
def health(service: ChainService = Depends(get_service)):
    try:
        return {"ok": True, **service.health()}
    except Exception as exc:
        log.warning("health check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Cannot reach the Tempo RPC") from exc


@app.post("/payments", response_model=PaymentOut, dependencies=[Depends(require_token)])
def create_payment(body: PaymentIn, service: ChainService = Depends(get_service)):
    try:
        sent = service.send_payment(body.to, body.amount_cents, body.reference)
    except ChainNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ChainError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return PaymentOut(**sent.__dict__)


@app.get("/transfers", response_model=list[TransferOut], dependencies=[Depends(require_token)])
def find_transfers(
    to: str = Query(...),
    reference: str = Query(..., min_length=1, max_length=64),
    from_block: int = Query(0, ge=0),
    service: ChainService = Depends(get_service),
):
    try:
        found = service.find_transfers(to, reference, from_block)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not query the chain: {exc}") from exc
    return [TransferOut(**{**t.__dict__, "amount_units": str(t.amount_units)}) for t in found]


@app.get("/transactions/{tx_hash}", response_model=TxOut, dependencies=[Depends(require_token)])
def transaction(tx_hash: str, service: ChainService = Depends(get_service)):
    try:
        info = service.transaction_info(tx_hash)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not query the chain: {exc}") from exc
    if info is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TxOut(**info.__dict__)
