"""Solana adapter tests against a scripted RPC, so they run offline.

They check what matters: the exact instructions that go on-chain, and how a payment is read back.
"""

import base64
import json

import pytest
from solders.hash import Hash
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.token.associated import get_associated_token_address
from solders.transaction import Transaction

from app.chain import ChainError, ChainNotConfigured
from app.memo import encode_reference
from app.solana_chain import (
    ASSOCIATED_TOKEN_PROGRAM,
    MEMO_PROGRAM,
    SYSTEM_PROGRAM,
    TOKEN_PROGRAM,
    SolanaService,
    derive_keypair,
    load_keypair,
)

SUPPLIER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
PAYER = derive_keypair("unit-test-seed", "solana-payer")


class FakeRpc:
    """Answers the handful of JSON-RPC methods the service uses and records what is sent."""

    def __init__(self):
        self.sent: list[Transaction] = []
        self.calls: list[str] = []
        self.lamports = 5_000_000_000
        self.mint_exists = True
        self.token_balance: int | None = 10**13
        self.signatures: dict[str, list[dict]] = {}
        self.transactions: dict[str, dict | None] = {}

    def call(self, method, params=None):
        self.calls.append(method)
        params = params or []
        if method == "getSlot":
            return 500
        if method == "getBalance":
            return {"value": self.lamports}
        if method == "getAccountInfo":
            return {"value": {"lamports": 1, "data": ["", "base64"]} if self.mint_exists else None}
        if method == "getTokenAccountBalance":
            if self.token_balance is None:
                raise ChainError("Solana RPC getTokenAccountBalance: Invalid param: could not find account")
            return {"value": {"amount": str(self.token_balance)}}
        if method == "getLatestBlockhash":
            return {"value": {"blockhash": str(Hash.default()), "lastValidBlockHeight": 1}}
        if method == "getMinimumBalanceForRentExemption":
            return 1_461_600
        if method == "requestAirdrop":
            self.lamports += params[1]
            return "airdrop-signature"
        if method == "sendTransaction":
            tx = Transaction.from_bytes(base64.b64decode(params[0]))
            self.sent.append(tx)
            return str(tx.signatures[0])
        if method == "getSignatureStatuses":
            return {"value": [{"slot": 321, "confirmationStatus": "confirmed", "err": None}]}
        if method == "getSignaturesForAddress":
            return self.signatures.get(params[0], [])
        if method == "getTransaction":
            return self.transactions.get(params[0])
        raise AssertionError(f"unexpected RPC method {method}")


@pytest.fixture
def rpc():
    return FakeRpc()


@pytest.fixture
def service(rpc):
    return SolanaService(rpc, PAYER)


def programs(tx: Transaction) -> list[Pubkey]:
    keys = tx.message.account_keys
    return [keys[i.program_id_index] for i in tx.message.instructions]


# ----- sending -----


def test_a_payment_is_one_transaction_with_the_token_account_the_transfer_and_the_memo(service, rpc):
    sent = service.send_payment(SUPPLIER, 8_000_000, "INV-2026-0845")

    assert len(rpc.sent) == 1
    tx = rpc.sent[0]
    assert programs(tx) == [ASSOCIATED_TOKEN_PROGRAM, TOKEN_PROGRAM, MEMO_PROGRAM]
    assert all(tx.verify_with_results()), "the transaction must be properly signed by the payer"

    create, transfer, memo = tx.message.instructions
    assert bytes(create.data) == bytes([1])  # create associated token account, idempotent
    assert bytes(transfer.data)[0] == 12  # transferChecked
    assert int.from_bytes(bytes(transfer.data)[1:9], "little") == 80_000_000_000  # US$ 80,000.00 in 6-decimal units
    assert bytes(transfer.data)[9] == 6
    assert bytes(memo.data) == b"INV-2026-0845"

    keys = tx.message.account_keys
    mint = service.mint
    assert keys[transfer.accounts[0]] == get_associated_token_address(PAYER.pubkey(), mint)
    assert keys[transfer.accounts[1]] == mint
    assert keys[transfer.accounts[2]] == get_associated_token_address(Pubkey.from_string(SUPPLIER), mint)

    assert sent.tx_hash == str(tx.signatures[0])
    assert sent.block_number == 321
    assert sent.memo_hex == "0x" + encode_reference("INV-2026-0845").hex()
    assert sent.from_address == str(PAYER.pubkey())


def test_a_funded_payer_does_not_trigger_any_setup(service, rpc):
    service.send_payment(SUPPLIER, 100, "INV-1")
    assert "requestAirdrop" not in rpc.calls and len(rpc.sent) == 1


def test_a_fresh_payer_is_funded_and_the_test_token_is_created_and_minted_first(service, rpc):
    rpc.lamports = 0
    rpc.mint_exists = False
    rpc.token_balance = None

    service.send_payment(SUPPLIER, 100, "INV-1")

    assert "requestAirdrop" in rpc.calls
    assert len(rpc.sent) == 3  # create the mint, mint test tokens, then the payment itself
    create_mint, mint_tokens, payment = rpc.sent
    assert programs(create_mint) == [SYSTEM_PROGRAM, TOKEN_PROGRAM]
    assert bytes(create_mint.message.instructions[1].data)[:2] == bytes([20, 6])  # initializeMint2, 6 decimals
    assert programs(mint_tokens) == [ASSOCIATED_TOKEN_PROGRAM, TOKEN_PROGRAM]
    assert bytes(mint_tokens.message.instructions[1].data)[0] == 7  # mintTo
    assert programs(payment) == [ASSOCIATED_TOKEN_PROGRAM, TOKEN_PROGRAM, MEMO_PROGRAM]


def test_the_payer_is_topped_up_when_its_token_balance_is_too_low(service, rpc):
    rpc.token_balance = 1_000  # less than the payment needs
    service.send_payment(SUPPLIER, 8_000_000, "INV-1")
    assert len(rpc.sent) == 2 and bytes(rpc.sent[0].message.instructions[1].data)[0] == 7


def test_bad_input_is_refused_before_anything_reaches_the_network(service, rpc):
    with pytest.raises(ValueError, match="32"):
        service.send_payment(SUPPLIER, 100, "INV-" + "9" * 40)
    with pytest.raises(ValueError, match="valid Solana address"):
        service.send_payment("0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0", 100, "INV-1")
    with pytest.raises(ValueError, match="greater than zero"):
        service.send_payment(SUPPLIER, 0, "INV-1")
    assert rpc.sent == []


def test_without_a_key_nothing_can_be_sent():
    svc = SolanaService(FakeRpc(), None)
    assert svc.configured is False and svc.address is None
    with pytest.raises(ChainNotConfigured):
        svc.send_payment(SUPPLIER, 100, "INV-1")


# ----- reading back -----


def _tx(service, memo, destination=None, mint=None, amount="80000000000", authority=None, err=None, slot=400):
    ata = get_associated_token_address(Pubkey.from_string(SUPPLIER), service.mint)
    return {
        "slot": slot,
        "blockTime": 1_760_068_800,
        "meta": {"err": err},
        "transaction": {
            "message": {
                "instructions": [
                    {"program": "spl-associated-token-account", "programId": str(ASSOCIATED_TOKEN_PROGRAM), "parsed": {"type": "createIdempotent"}},
                    {
                        "program": "spl-token",
                        "programId": str(TOKEN_PROGRAM),
                        "parsed": {
                            "type": "transferChecked",
                            "info": {
                                "authority": authority or str(PAYER.pubkey()),
                                "destination": destination or str(ata),
                                "mint": mint or str(service.mint),
                                "source": "src",
                                "tokenAmount": {"amount": amount, "decimals": 6},
                            },
                        },
                    },
                    {"program": "spl-memo", "programId": str(MEMO_PROGRAM), "parsed": memo},
                ]
            }
        },
    }


def _listing(service, signature, memo, slot=400, err=None):
    return {"signature": signature, "slot": slot, "err": err, "memo": f"[{len(memo)}] {memo}"}


def test_find_transfers_returns_only_real_matches(service, rpc):
    ata = str(get_associated_token_address(Pubkey.from_string(SUPPLIER), service.mint))
    rpc.signatures[ata] = [
        _listing(service, "good", "INV-1"),
        _listing(service, "other-invoice", "INV-2"),  # different memo: skipped without fetching the transaction
        _listing(service, "failed", "INV-1", err={"InstructionError": [0, "Custom"]}),
        _listing(service, "wrong-dest", "INV-1"),
        _listing(service, "wrong-mint", "INV-1"),
        _listing(service, "old", "INV-1", slot=10),
    ]
    rpc.transactions = {
        "good": _tx(service, "INV-1"),
        "wrong-dest": _tx(service, "INV-1", destination="SomeoneElsesTokenAccount"),
        "wrong-mint": _tx(service, "INV-1", mint=str(Keypair().pubkey())),
        "old": _tx(service, "INV-1", slot=10),
    }

    found = service.find_transfers(SUPPLIER, "INV-1", from_block=100)

    assert [t.tx_hash for t in found] == ["good"]
    t = found[0]
    assert (t.log_index, t.block_number, t.amount_units) == (1, 400, 80_000_000_000)
    assert t.to_address == SUPPLIER and t.from_address == str(PAYER.pubkey())
    assert t.memo_hex == "0x" + encode_reference("INV-1").hex()
    assert "other-invoice" not in [c for c in rpc.transactions]  # sanity: never requested
    assert service.find_transfers(SUPPLIER, "INV-1", from_block=401) == []


def test_find_transfers_on_an_address_that_never_received_anything_is_empty(service):
    assert service.find_transfers(SUPPLIER, "INV-1", 0) == []


def test_transaction_info(service, rpc):
    rpc.transactions["ok"] = _tx(service, "INV-1")
    rpc.transactions["bad"] = _tx(service, "INV-1", err={"InstructionError": [1, "Custom"]})
    ok = service.transaction_info("ok")
    assert ok.status == "success" and ok.block_number == 400 and ok.timestamp.startswith("2025-10-10")
    assert service.transaction_info("bad").status == "reverted"
    assert service.transaction_info("unknown") is None


def test_health_reports_the_payer_and_the_token(service, rpc):
    h = service.health()
    assert h["configured"] is True and h["cluster"] == "devnet" and h["latest_slot"] == 500
    assert h["payer_address"] == str(PAYER.pubkey()) and h["token_mint"] == str(service.mint)


# ----- keys -----


def test_keys_are_deterministic_and_one_secret_serves_both_networks():
    a = SolanaService.from_environment("http://x", None, "tempo-testnet-key")
    b = SolanaService.from_environment("http://x", None, "tempo-testnet-key")
    c = SolanaService.from_environment("http://x", None, "another-key")
    assert a.address == b.address and a.mint == b.mint  # the same token is found again after a restart
    assert a.address != c.address and a.mint != c.mint


def test_an_explicit_solana_key_wins_and_both_formats_load():
    kp = Keypair()
    as_base58 = str(kp)
    as_json = json.dumps(list(bytes(kp)))
    assert load_keypair(as_base58).pubkey() == kp.pubkey()
    assert load_keypair(as_json).pubkey() == kp.pubkey()
    svc = SolanaService.from_environment("http://x", as_base58, "ignored")
    assert svc.address == str(kp.pubkey())


def test_nothing_configured_means_unconfigured():
    svc = SolanaService.from_environment("http://x", None, None)
    assert svc.configured is False
