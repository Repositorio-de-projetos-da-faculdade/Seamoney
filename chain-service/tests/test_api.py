"""API contract tests with fake chains, so they run offline and fast."""

from fastapi.testclient import TestClient

from app.chain import ChainError, ChainNotConfigured, FoundTransfer, SentPayment, TxInfo
from app.main import app, get_services

SUPPLIER = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0"
SOLANA_SUPPLIER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"


class FakeChain:
    """Stands in for a network service. `tag` makes it visible which network handled a call."""

    configured = True

    def __init__(self, tag="tempo", address="0x7F44CF78Cd8052FB426Dd8C818498A1e1d7e8835", chain_id=42431):
        self.tag = tag
        self.address = address
        self.chain_id = chain_id
        self.calls = []
        self.fail_with: Exception | None = None
        self.health_fails = False

    def health(self):
        if self.health_fails:
            raise RuntimeError("rpc down")
        return {"configured": True, "partner_address": self.address, "chain_id": self.chain_id, "latest_block": 123}

    def send_payment(self, to, amount_cents, reference):
        if self.fail_with:
            raise self.fail_with
        self.calls.append((to, amount_cents, reference))
        return SentPayment(f"{self.tag}-abc", 10, 1200, "0x" + reference.encode().hex().ljust(64, "0"), self.address)

    def find_transfers(self, to, reference, from_block):
        return [FoundTransfer(f"{self.tag}-abc", 2, 10, self.address, to, 80_000_000_000, "0x00")]

    def get_events(self, token, from_cursor):
        return [FoundTransfer(f"{self.tag}-event", 1, 10, self.address, "0xtarget", 100, "0x00")]

    def transaction_info(self, tx_hash):
        return TxInfo("success", 10, "2026-10-10T04:00:00+00:00") if tx_hash == f"{self.tag}-abc" else None


def client_with(tempo: FakeChain | None = None, solana: FakeChain | None = None) -> TestClient:
    services = {
        "tempo": tempo or FakeChain("tempo"),
        "solana": solana or FakeChain("solana", address="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", chain_id=0),
    }
    app.dependency_overrides[get_services] = lambda: services
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()
    from app.idempotency import store
    store.store.clear()


def test_health_reports_every_network():
    body = client_with().get("/health").json()
    assert body["ok"] is True
    assert body["chain_id"] == 42431  # the Tempo fields stay at the top level for older callers
    assert set(body["networks"]) == {"tempo", "solana"}


def test_health_survives_one_network_being_down_but_not_both():
    tempo, solana = FakeChain("tempo"), FakeChain("solana")
    solana.health_fails = True
    body = client_with(tempo, solana).get("/health").json()
    assert body["ok"] is True and "error" in body["networks"]["solana"] and "error" not in body["networks"]["tempo"]
    tempo.health_fails = True
    assert client_with(tempo, solana).get("/health").status_code == 503


def test_create_payment_returns_the_transaction():
    fake = FakeChain()
    res = client_with(tempo=fake).post("/payments", json={"to": SUPPLIER, "amount_cents": 8_000_000, "reference": "INV-1"}, headers={"Idempotency-Key": "key1"})
    assert res.status_code == 200
    assert res.json()["tx_hash"] == "tempo-abc"
    assert fake.calls == [(SUPPLIER, 8_000_000, "INV-1")]


def test_the_network_field_selects_the_service():
    tempo, solana = FakeChain("tempo"), FakeChain("solana")
    c = client_with(tempo, solana)
    res = c.post("/payments", json={"to": SOLANA_SUPPLIER, "amount_cents": 100, "reference": "INV-S", "network": "solana"}, headers={"Idempotency-Key": "key2"})
    assert res.status_code == 200 and res.json()["tx_hash"] == "solana-abc"
    assert solana.calls == [(SOLANA_SUPPLIER, 100, "INV-S")] and tempo.calls == []
    assert c.post("/payments", json={"to": SUPPLIER, "amount_cents": 100, "reference": "x", "network": "bitcoin"}, headers={"Idempotency-Key": "key3"}).status_code == 422


def test_payment_validation_rejects_zero_and_huge_amounts():
    c = client_with()
    assert c.post("/payments", json={"to": SUPPLIER, "amount_cents": 0, "reference": "x"}, headers={"Idempotency-Key": "key4"}).status_code == 422
    assert c.post("/payments", json={"to": SUPPLIER, "amount_cents": 10**12, "reference": "x"}, headers={"Idempotency-Key": "key5"}).status_code == 422


def test_error_mapping_is_the_same_on_both_networks():
    for network in ("tempo", "solana"):
        fake = FakeChain(network)
        c = client_with(**{network: fake})
        body = {"to": SUPPLIER, "amount_cents": 100, "reference": "x", "network": network}
        fake.fail_with = ChainNotConfigured("no key")
        assert c.post("/payments", json=body, headers={"Idempotency-Key": f"key6_{network}"}).status_code == 503
        fake.fail_with = ValueError("Payment references must fit in 32 UTF-8 bytes")
        assert c.post("/payments", json=body, headers={"Idempotency-Key": f"key7_{network}"}).status_code == 400
        fake.fail_with = ChainError("reverted")
        assert c.post("/payments", json=body, headers={"Idempotency-Key": f"key8_{network}"}).status_code == 502


def test_transfers_amount_is_a_string_and_the_network_is_honoured():
    c = client_with()
    res = c.get("/transfers", params={"to": SUPPLIER, "reference": "INV-1", "from_block": 5})
    assert res.status_code == 200
    assert res.json()[0]["amount_units"] == "80000000000" and res.json()[0]["tx_hash"] == "tempo-abc"
    res = c.get("/transfers", params={"to": SOLANA_SUPPLIER, "reference": "INV-1", "network": "solana"})
    assert res.json()[0]["tx_hash"] == "solana-abc"


def test_unknown_transaction_is_404():
    c = client_with()
    assert c.get("/transactions/0xdead").status_code == 404
    assert c.get("/transactions/tempo-abc").json()["status"] == "success"
    assert c.get("/transactions/solana-abc", params={"network": "solana"}).json()["status"] == "success"
    assert c.get("/transactions/solana-abc").status_code == 404  # a Solana signature is unknown on Tempo


def test_internal_token_is_enforced_when_configured(monkeypatch):
    monkeypatch.setenv("CHAIN_SERVICE_TOKEN", "s3cret")
    c = client_with()
    body = {"to": SUPPLIER, "amount_cents": 100, "reference": "x"}
    assert c.post("/payments", json=body, headers={"Idempotency-Key": "key9"}).status_code == 401
    assert c.post("/payments", json=body, headers={"X-Internal-Token": "wrong", "Idempotency-Key": "key9"}).status_code == 401
    assert c.post("/payments", json=body, headers={"X-Internal-Token": "s3cret", "Idempotency-Key": "key9"}).status_code == 200
    assert c.get("/health").status_code == 200  # health stays open for container probes


def test_idempotency_same_key_same_body():
    fake = FakeChain()
    c = client_with(tempo=fake)
    body = {"to": SUPPLIER, "amount_cents": 100, "reference": "INV-IDEM"}
    res1 = c.post("/payments", json=body, headers={"Idempotency-Key": "idk-1"})
    res2 = c.post("/payments", json=body, headers={"Idempotency-Key": "idk-1"})
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json() == res2.json()
    assert len(fake.calls) == 1

def test_idempotency_different_body_conflict():
    fake = FakeChain()
    c = client_with(tempo=fake)
    c.post("/payments", json={"to": SUPPLIER, "amount_cents": 100, "reference": "A"}, headers={"Idempotency-Key": "idk-2"})
    res = c.post("/payments", json={"to": SUPPLIER, "amount_cents": 100, "reference": "B"}, headers={"Idempotency-Key": "idk-2"})
    assert res.status_code == 409

def test_idempotency_get_status():
    fake = FakeChain()
    c = client_with(tempo=fake)
    c.post("/payments", json={"to": SUPPLIER, "amount_cents": 100, "reference": "A"}, headers={"Idempotency-Key": "idk-3"})
    res = c.get("/payments/idk-3")
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"
    assert res.json()["tx_hash"] == "tempo-abc"

def test_events_endpoint():
    c = client_with()
    res = c.get("/events", params={"from": "10"})
    assert res.status_code == 200
    assert res.json()[0]["tx_hash"] == "tempo-event"
    res_solana = c.get("/events", params={"network": "solana", "from": "sig"})
    assert res_solana.status_code == 200
    assert res_solana.json()[0]["tx_hash"] == "solana-event"
