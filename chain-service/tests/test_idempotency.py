"""A payment is never sent twice: the idempotency record decides, and the chain is asked before anything is resent."""

import json
import threading
import time

from fastapi.testclient import TestClient

from app.chain import ChainError, FoundTransfer, SentPayment
from app.idempotency import IdempotencyStore, store
from app.main import app, get_services

SUPPLIER = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0"
BODY = {"to": SUPPLIER, "amount_cents": 8_000_000, "reference": "SM-7K3QX9PA", "network": "tempo"}
UNITS = 8_000_000 * 10_000


class Chain:
    """A chain service whose view of the chain is set by the test (`visible`), and that counts what it sends."""

    def __init__(self, delay: float = 0.0, visible=None):
        self.sent = []
        self.delay = delay
        self.visible = visible or []
        self.fail_with: Exception | None = None

    def send_payment(self, to, amount_cents, reference):
        time.sleep(self.delay)
        if self.fail_with:
            raise self.fail_with
        self.sent.append((to, amount_cents, reference))
        n = len(self.sent)
        return SentPayment(f"0xtx{n}", 10 + n, 900, "0x00", "0xpartner")

    def find_transfers(self, to, reference, from_block):
        return list(self.visible)


def transfer(units=UNITS, tx="0xfirst"):
    return FoundTransfer(tx, 1, 10, "0xpartner", SUPPLIER, units, "0x00")


def client(chain) -> TestClient:
    app.dependency_overrides[get_services] = lambda: {"tempo": chain, "solana": chain}
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def pay(c, key="ORD-AAAAAA-1", body=None):
    return c.post("/payments", json=body or BODY, headers={"Idempotency-Key": key})


def test_a_timeout_leaves_the_payment_pending_and_a_retry_does_not_send_again():
    chain = Chain()
    chain.fail_with = ChainError("Could not confirm the transfer: timed out")
    c = client(chain)
    assert pay(c).status_code == 502
    assert store.get("ORD-AAAAAA-1")["status"] == "pending"

    chain.fail_with = None
    retry = pay(c)  # the first transaction is not visible yet: it may still land, so nothing is sent
    assert retry.status_code == 409 and "not sent again" in retry.json()["detail"]
    assert chain.sent == []


def test_a_retry_returns_the_first_payment_once_it_shows_on_the_chain():
    chain = Chain()
    chain.fail_with = ChainError("Could not confirm the transfer: timed out")
    c = client(chain)
    pay(c)

    chain.fail_with = None
    chain.visible = [transfer()]
    res = pay(c)
    assert res.status_code == 200 and res.json()["tx_hash"] == "0xfirst"
    assert chain.sent == []
    assert store.get("ORD-AAAAAA-1")["status"] == "confirmed"
    assert pay(c).json()["tx_hash"] == "0xfirst"  # and from now on it is just replayed


def test_a_transfer_with_the_wrong_amount_is_not_taken_for_the_payment():
    chain = Chain(visible=[transfer(units=1)])
    store.claim("ORD-AAAAAA-1", BODY)
    res = pay(client(chain))
    assert res.status_code == 409 and "different amount" in res.json()["detail"]
    assert chain.sent == []


def test_an_expired_attempt_that_never_reached_the_chain_becomes_failed_and_a_new_key_may_pay():
    chain = Chain()
    c = client(chain)
    store.set("ORD-AAAAAA-1", "pending", BODY, created_at=time.time() - 3600)

    res = pay(c)
    assert res.status_code == 502 and "expired" in res.json()["detail"]
    assert chain.sent == []
    assert c.get("/payments/ORD-AAAAAA-1").json() == {"status": "failed"}

    assert pay(c, key="ORD-AAAAAA-2").status_code == 200  # the rules service moves to a new key after "failed"
    assert len(chain.sent) == 1


def test_the_grace_period_can_be_set(monkeypatch):
    monkeypatch.setenv("PAYMENT_PENDING_GRACE_SECONDS", "5")
    chain = Chain()
    store.set("k-old", "pending", BODY, created_at=time.time() - 10)
    store.set("k-new", "pending", BODY, created_at=time.time() - 1)
    c = client(chain)
    assert pay(c, key="k-old").status_code == 502
    assert pay(c, key="k-new").status_code == 409


def test_two_requests_with_the_same_key_send_exactly_one_payment():
    chain = Chain(delay=0.4)
    c = client(chain)
    codes = []

    def go():
        codes.append(pay(c, key="ORD-BBBBBB-1").status_code)

    threads = [threading.Thread(target=go) for _ in range(3)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert sorted(codes) == [200, 409, 409]
    assert len(chain.sent) == 1


def test_the_same_key_with_another_body_is_refused():
    c = client(Chain())
    assert pay(c).status_code == 200
    assert pay(c, body={**BODY, "amount_cents": 1}).status_code == 409


def test_the_status_endpoint_settles_a_pending_payment_from_the_chain():
    chain = Chain()
    c = client(chain)
    store.set("ORD-CCCCCC-1", "pending", BODY)
    assert c.get("/payments/ORD-CCCCCC-1").json() == {"status": "pending"}  # young and not on the chain

    chain.visible = [transfer()]
    assert c.get("/payments/ORD-CCCCCC-1").json() == {"status": "confirmed", "tx_hash": "0xfirst"}
    assert c.get("/payments/unknown").status_code == 404


def test_the_record_is_written_atomically_and_survives_a_crash_while_saving(tmp_path, monkeypatch):
    s = IdempotencyStore(str(tmp_path))
    s.set("a", "confirmed", BODY, {"tx_hash": "0x1"})

    def crash(src, dst):
        raise OSError("disk went away")

    monkeypatch.setattr("app.idempotency.os.replace", crash)
    try:
        s.set("b", "confirmed", BODY, {"tx_hash": "0x2"})
    except OSError:
        pass
    monkeypatch.undo()

    assert json.loads((tmp_path / "idempotency.json").read_text())["a"]["status"] == "confirmed"
    assert "b" not in json.loads((tmp_path / "idempotency.json").read_text())


def test_an_unreadable_record_is_kept_aside_and_not_overwritten(tmp_path):
    (tmp_path / "idempotency.json").write_text('{"half": ')
    s = IdempotencyStore(str(tmp_path))
    assert s.store == {}
    assert [p.name for p in tmp_path.iterdir() if ".corrupt-" in p.name]
    s.set("a", "pending", BODY)
    assert json.loads((tmp_path / "idempotency.json").read_text())["a"]["status"] == "pending"


def test_the_first_attempt_time_survives_later_updates():
    s = IdempotencyStore.__new__(IdempotencyStore)
    s.lock = threading.Lock()
    s.store = {}
    s._save = lambda: None  # no disk needed here
    s.set("a", "pending", BODY, created_at=123.0)
    s.set("a", "confirmed", BODY, {"tx_hash": "0x1"})
    assert s.store["a"]["created_at"] == 123.0
