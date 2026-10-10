"""API contract tests with a fake chain, so they run offline and fast."""

from fastapi.testclient import TestClient

from app.chain import ChainError, ChainNotConfigured, FoundTransfer, SentPayment, TxInfo
from app.main import app, get_service

SUPPLIER = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0"


class FakeChain:
    configured = True
    address = "0x7F44CF78Cd8052FB426Dd8C818498A1e1d7e8835"

    def __init__(self):
        self.calls = []
        self.fail_with: Exception | None = None

    def health(self):
        return {"configured": True, "partner_address": self.address, "chain_id": 42431, "latest_block": 123}

    def send_payment(self, to, amount_cents, reference):
        if self.fail_with:
            raise self.fail_with
        self.calls.append((to, amount_cents, reference))
        return SentPayment("0xabc", 10, 1200, "0x" + reference.encode().hex().ljust(64, "0"), self.address)

    def find_transfers(self, to, reference, from_block):
        return [FoundTransfer("0xabc", 2, 10, self.address, to, 80_000_000_000, "0x00")]

    def transaction_info(self, tx_hash):
        return TxInfo("success", 10, "2026-10-10T04:00:00+00:00") if tx_hash == "0xabc" else None


def client_with(fake: FakeChain) -> TestClient:
    app.dependency_overrides[get_service] = lambda: fake
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_health_reports_the_partner_wallet():
    body = client_with(FakeChain()).get("/health").json()
    assert body["ok"] is True and body["chain_id"] == 42431


def test_create_payment_returns_the_transaction():
    fake = FakeChain()
    res = client_with(fake).post("/payments", json={"to": SUPPLIER, "amount_cents": 8_000_000, "reference": "INV-1"})
    assert res.status_code == 200
    assert res.json()["tx_hash"] == "0xabc"
    assert fake.calls == [(SUPPLIER, 8_000_000, "INV-1")]


def test_payment_validation_rejects_zero_and_huge_amounts():
    c = client_with(FakeChain())
    assert c.post("/payments", json={"to": SUPPLIER, "amount_cents": 0, "reference": "x"}).status_code == 422
    assert c.post("/payments", json={"to": SUPPLIER, "amount_cents": 10**12, "reference": "x"}).status_code == 422


def test_error_mapping():
    fake = FakeChain()
    c = client_with(fake)
    body = {"to": SUPPLIER, "amount_cents": 100, "reference": "x"}
    fake.fail_with = ChainNotConfigured("no key")
    assert c.post("/payments", json=body).status_code == 503
    fake.fail_with = ValueError("Payment references must fit in 32 UTF-8 bytes")
    assert c.post("/payments", json=body).status_code == 400
    fake.fail_with = ChainError("reverted")
    assert c.post("/payments", json=body).status_code == 502


def test_transfers_amount_is_a_string():
    res = client_with(FakeChain()).get("/transfers", params={"to": SUPPLIER, "reference": "INV-1", "from_block": 5})
    assert res.status_code == 200
    assert res.json()[0]["amount_units"] == "80000000000"


def test_unknown_transaction_is_404():
    assert client_with(FakeChain()).get("/transactions/0xdead").status_code == 404
    assert client_with(FakeChain()).get("/transactions/0xabc").json()["status"] == "success"


def test_internal_token_is_enforced_when_configured(monkeypatch):
    monkeypatch.setenv("CHAIN_SERVICE_TOKEN", "s3cret")
    c = client_with(FakeChain())
    body = {"to": SUPPLIER, "amount_cents": 100, "reference": "x"}
    assert c.post("/payments", json=body).status_code == 401
    assert c.post("/payments", json=body, headers={"X-Internal-Token": "wrong"}).status_code == 401
    assert c.post("/payments", json=body, headers={"X-Internal-Token": "s3cret"}).status_code == 200
    assert c.get("/health").status_code == 200  # health stays open for container probes
