"""When the partner wallet cannot pay, the caller gets a message it can act on, and nothing is left half done.

The public Tempo faucet is sometimes down (it has answered "request too large" to every address), so a wallet that is
short of AlphaUSD cannot be refilled: that must be a clear, immediate "not sent", not a bare HTTP 500.
"""

import pytest
import requests
from eth_account import Account
from fastapi.testclient import TestClient

from app import chain as chain_module
from app.chain import ChainError, ChainService, PaymentNotSent, SentPayment
from app.idempotency import store
from app.main import app, get_services

KEY = "0x" + "11" * 32
SUPPLIER = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0"
BODY = {"to": SUPPLIER, "amount_cents": 8_000_000, "reference": "SM-7K3QX9PA", "network": "tempo"}
EIGHTY_THOUSAND = 80_000 * 1_000_000


class StubEth:
    account = Account


class StubProvider:
    def __init__(self, answer):
        self.answer = answer
        self.calls = 0

    def make_request(self, method, params):
        self.calls += 1
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


class StubW3:
    def __init__(self, answer=None):
        self.eth = StubEth()
        self.provider = StubProvider(answer if answer is not None else {"result": "ok"})


def service(balance, faucet=None):
    s = ChainService(private_key=KEY, w3=StubW3(faucet))
    s.balance_units = lambda address: balance() if callable(balance) else balance
    return s


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    monkeypatch.setattr(chain_module.time, "sleep", lambda seconds: None)


def test_enough_money_never_asks_the_faucet():
    s = service(balance=EIGHTY_THOUSAND + 10_000_000)
    s._ensure_funds(EIGHTY_THOUSAND)
    assert s.w3.provider.calls == 0


def test_a_faucet_that_answers_with_an_http_error_is_a_clear_not_sent():
    s = service(balance=21_474_997_030, faucet=requests.HTTPError("413 Client Error: Payload Too Large for url: https://rpc.moderato.tempo.xyz/"))
    with pytest.raises(PaymentNotSent) as caught:
        s._ensure_funds(EIGHTY_THOUSAND)
    message = str(caught.value)
    assert "21,475.00" in message and "80,005.00" in message, message  # what it holds and what it needs
    assert "faucet did not answer" in message and "413" in message
    assert s.address in message, "it says where to send test tokens"


def test_a_faucet_that_answers_with_an_rpc_error_is_a_clear_not_sent():
    s = service(balance=5, faucet={"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "request too large"}})
    with pytest.raises(PaymentNotSent, match="faucet refused"):
        s._ensure_funds(EIGHTY_THOUSAND)
    assert s.w3.provider.calls == 1, "it stops at the first refusal instead of asking three times"


def test_a_faucet_that_does_not_refill_ends_as_not_sent_after_three_tries():
    s = service(balance=5)
    with pytest.raises(PaymentNotSent, match="did not refill"):
        s._ensure_funds(EIGHTY_THOUSAND)
    assert s.w3.provider.calls == 3


def test_a_refill_that_works_lets_the_payment_go_on():
    balances = iter([5, EIGHTY_THOUSAND + 10_000_000])
    s = service(balance=lambda: next(balances))
    s._ensure_funds(EIGHTY_THOUSAND)
    assert s.w3.provider.calls == 1


def test_an_rpc_that_cannot_give_the_balance_is_a_not_sent_too():
    def broken():
        raise ConnectionError("rpc down")

    with pytest.raises(PaymentNotSent, match="Could not read the partner wallet balance"):
        service(balance=broken)._ensure_funds(1)


def test_not_sent_is_a_chain_error_so_old_callers_still_catch_it():
    assert issubclass(PaymentNotSent, ChainError)


# ---- the HTTP side ---------------------------------------------------------------------------------------------


class Chain:
    def __init__(self, fail_with):
        self.fail_with = fail_with
        self.sent = 0

    def send_payment(self, to, amount_cents, reference):
        if self.fail_with:
            raise self.fail_with
        self.sent += 1
        return SentPayment("0xtx", 1, 900, "0x00", "0xpartner")

    def find_transfers(self, to, reference, from_block):
        return []


def client(chain) -> TestClient:
    app.dependency_overrides[get_services] = lambda: {"tempo": chain, "solana": chain}
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_no_funds_answers_502_with_the_reason_and_may_be_retried_at_once():
    chain = Chain(PaymentNotSent("The partner test wallet holds 21,474.99 AlphaUSD, and this payment needs 80,005.00 ..."))
    c = client(chain)
    res = c.post("/payments", json=BODY, headers={"Idempotency-Key": "ORD-NOFUND-1"})
    assert res.status_code == 502 and "21,474.99" in res.json()["detail"]
    # nothing was sent, so the attempt is "failed" right away: the rules service moves to a new key and nobody waits 10 minutes
    assert c.get("/payments/ORD-NOFUND-1").json() == {"status": "failed"}

    chain.fail_with = None
    assert c.post("/payments", json=BODY, headers={"Idempotency-Key": "ORD-NOFUND-2"}).status_code == 200
    assert chain.sent == 1


def test_an_unexpected_failure_is_readable_and_never_marked_failed():
    c = client(Chain(RuntimeError("boom")))
    res = c.post("/payments", json=BODY, headers={"Idempotency-Key": "ORD-BOOM-1"})
    assert res.status_code == 502, "a readable answer, not a bare 500"
    assert "RuntimeError" in res.json()["detail"] and "checked on the chain" in res.json()["detail"]
    assert store.get("ORD-BOOM-1")["status"] == "pending", "it may have been broadcast: the chain decides later"
