"""HTTP API of the chain service. Stateless: it never stores orders, it only talks to the blockchains.

Two settlement networks are supported and every call names one (`network`, default "tempo"):
  - tempo:  Tempo Moderato testnet, TIP-20 stablecoin with a 32-byte memo
  - solana: Solana devnet, SPL token transfer with the Memo program

The Java rules service is the only intended caller. When CHAIN_SERVICE_TOKEN is set, every call
(except /health) must send it in the X-Internal-Token header.
"""

from __future__ import annotations

import logging
import os
import secrets
import time
from functools import lru_cache
from typing import Callable, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from .chain import ChainError, ChainNotConfigured, ChainService, DEFAULT_RPC
from .idempotency import store
from .memo import cents_to_units
from .solana_chain import DEFAULT_RPC as SOLANA_DEFAULT_RPC
from .solana_chain import SolanaService

log = logging.getLogger("seamoney.chain")
app = FastAPI(title="Seamoney chain service", version="1.1.0")

Network = Literal["tempo", "solana"]
NETWORKS: tuple[str, ...] = ("tempo", "solana")


def get_service() -> ChainService:
    """The Tempo service (kept under this name for the scripts)."""
    return ChainService(
        rpc_url=os.environ.get("TEMPO_RPC_URL", DEFAULT_RPC),
        private_key=os.environ.get("TEMPO_PARTNER_PRIVATE_KEY") or None,
        gas_limit=int(os.environ.get("TEMPO_GAS_LIMIT", "500000")),
    )


def get_solana_service() -> SolanaService:
    return SolanaService.from_environment(
        rpc_url=os.environ.get("SOLANA_RPC_URL", SOLANA_DEFAULT_RPC),
        payer_secret=os.environ.get("SOLANA_PAYER_PRIVATE_KEY") or None,
        # no dedicated key: derive a devnet key from the Tempo testnet key, so one secret serves both networks
        fallback_seed=os.environ.get("TEMPO_PARTNER_PRIVATE_KEY") or None,
    )


class Services:
    """Builds each network's service on first use, so a problem with one network never breaks the other."""

    _builders: dict[str, Callable[[], object]] = {"tempo": get_service, "solana": get_solana_service}

    def __init__(self) -> None:
        self._made: dict[str, object] = {}

    def __getitem__(self, network: str):
        if network not in self._made:
            self._made[network] = self._builders[network]()
        return self._made[network]


@lru_cache
def get_services() -> Services:
    return Services()


def require_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = os.environ.get("CHAIN_SERVICE_TOKEN")
    if expected and not secrets.compare_digest(x_internal_token or "", expected):
        raise HTTPException(status_code=401, detail="Missing or invalid internal token")


class PaymentIn(BaseModel):
    to: str
    amount_cents: int = Field(gt=0, le=100_000_000)  # US$ 1,000,000 cap on the demo
    reference: str = Field(min_length=1, max_length=64)
    network: Network = "tempo"


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
def health(services: Services = Depends(get_services)):
    """Healthy when at least one network answers. Each network is reported on its own."""
    networks: dict[str, dict] = {}
    for name in NETWORKS:
        try:
            networks[name] = services[name].health()
        except Exception as exc:
            log.warning("%s health check failed: %s", name, exc)
            networks[name] = {"error": f"Cannot reach the {name} network"}
    if all("error" in info for info in networks.values()):
        raise HTTPException(status_code=503, detail="Cannot reach any blockchain RPC")
    legacy = networks["tempo"] if "error" not in networks["tempo"] else {}
    return {"ok": True, **legacy, "networks": networks}


def _grace_seconds() -> float:
    """How long an unfinished payment may still be on its way to the chain before it is treated as lost."""
    try:
        return max(0.0, float(os.environ.get("PAYMENT_PENDING_GRACE_SECONDS", "600")))
    except ValueError:
        return 600.0


def _settle_pending(key: str, entry: dict, services: Services) -> dict:
    """Decides what happened to a payment that was started and never recorded as finished.

    It never sends again just because the chain does not show the payment yet: a transaction that was broadcast
    can still be mined minutes later, and a second one would pay the supplier twice. So:
      - the transfer is on the chain: the payment is confirmed (and recorded as such);
      - it is not, and the attempt is younger than the grace period: it may still land, so refuse (409);
      - it is not, and the grace period is over: record it as failed, so the caller uses a new key.
    """
    body = entry["body"]
    try:
        found = services[body["network"]].find_transfers(body["to"], body["reference"], 0)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not verify the previous attempt on the chain") from exc
    wanted = cents_to_units(body["amount_cents"])
    same_amount = [t for t in found if t.amount_units == wanted]
    if same_amount:
        t = same_amount[0]
        result = {
            "tx_hash": t.tx_hash,
            "block_number": t.block_number,
            "confirm_ms": 0,
            "memo_hex": t.memo_hex,
            "from_address": t.from_address,
        }
        store.set(key, "confirmed", body, result)
        return result
    if found:
        raise HTTPException(
            status_code=409,
            detail="A transfer with this reference already exists with a different amount; check it before paying again",
        )
    if time.time() - entry.get("created_at", 0) < _grace_seconds():
        raise HTTPException(
            status_code=409,
            detail="The previous attempt may still be on its way to the chain, so it is not sent again. Check again in a few minutes.",
        )
    detail = "The previous attempt never reached the chain and has expired; send again with a new key."
    store.set(key, "failed", body, error_code=502, error_detail=detail)
    raise HTTPException(status_code=502, detail=detail)


@app.post("/payments", response_model=PaymentOut, dependencies=[Depends(require_token)])
def create_payment(
    body: PaymentIn,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    services: Services = Depends(get_services)
):
    body_dict = body.model_dump()
    # atomic: of two requests with the same key only one is told it created the record and may send
    existing, created = store.claim(idempotency_key, body_dict)
    if not created:
        if existing["body"] != body_dict:
            raise HTTPException(status_code=409, detail="Idempotency key already used with a different body")
        if existing["status"] == "confirmed":
            return PaymentOut(**existing["result"])
        if existing["status"] == "failed":
            raise HTTPException(
                status_code=existing.get("error_code", 400),
                detail=existing.get("error_detail", "Payment failed previously")
            )
        return PaymentOut(**_settle_pending(idempotency_key, existing, services))

    try:
        sent = services[body.network].send_payment(body.to, body.amount_cents, body.reference)
        store.set(idempotency_key, "confirmed", body_dict, sent.__dict__)
        return PaymentOut(**sent.__dict__)
    except ValueError as exc:
        store.set(idempotency_key, "failed", body_dict, error_code=400, error_detail=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ChainNotConfigured as exc:
        store.set(idempotency_key, "failed", body_dict, error_code=503, error_detail=str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ChainError as exc:
        # Only a payment known not to have happened is marked failed. Any other failure (a timeout waiting for the
        # receipt, an RPC error) leaves it pending: the transaction may still land, and _settle_pending decides later.
        if "reverted" in str(exc).lower() or "rejected" in str(exc).lower():
            store.set(idempotency_key, "failed", body_dict, error_code=502, error_detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/payments/{key}", dependencies=[Depends(require_token)])
def get_payment_status(key: str, services: Services = Depends(get_services)):
    entry = store.get(key)
    if not entry:
        raise HTTPException(status_code=404, detail="Idempotency key not found")
    if entry["status"] == "pending":
        try:
            _settle_pending(key, entry, services)
        except HTTPException:
            pass  # still pending, or just recorded as failed: report what the record says now
        entry = store.get(key) or entry
    out = {"status": entry["status"]}
    if entry.get("result"):
        out["tx_hash"] = entry["result"].get("tx_hash")
    return out


@app.get("/events", response_model=list[TransferOut], dependencies=[Depends(require_token)])
def get_events(
    network: Network = Query("tempo"),
    token: str = Query(None),
    from_cursor: str = Query(..., alias="from"),
    services: Services = Depends(get_services)
):
    try:
        found = services[network].get_events(token, from_cursor)
    except ChainNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not query the chain: {exc}") from exc
    return [TransferOut(**{**t.__dict__, "amount_units": str(t.amount_units)}) for t in found]


@app.get("/transfers", response_model=list[TransferOut], dependencies=[Depends(require_token)])
def find_transfers(
    to: str = Query(...),
    reference: str = Query(..., min_length=1, max_length=64),
    from_block: int = Query(0, ge=0),
    network: Network = Query("tempo"),
    services: Services = Depends(get_services),
):
    try:
        found = services[network].find_transfers(to, reference, from_block)
    except ChainNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not query the chain: {exc}") from exc
    return [TransferOut(**{**t.__dict__, "amount_units": str(t.amount_units)}) for t in found]


@app.get("/transactions/{tx_hash}", response_model=TxOut, dependencies=[Depends(require_token)])
def transaction(tx_hash: str, network: Network = Query("tempo"), services: Services = Depends(get_services)):
    try:
        info = services[network].transaction_info(tx_hash)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not query the chain: {exc}") from exc
    if info is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TxOut(**info.__dict__)
