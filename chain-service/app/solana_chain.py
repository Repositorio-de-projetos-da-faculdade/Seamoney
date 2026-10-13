"""Everything that touches Solana lives in this file. Devnet only.

A payment is ONE transaction with three instructions: create the supplier's token account if it does not exist
yet (idempotent), an SPL `transferChecked`, and a Memo-program instruction carrying the payment reference. To
reconcile, we list the signatures of the supplier's token account, read the transactions back and look for the
same memo next to a transfer of our token into that account.

The token is "Seamoney test USD": an SPL token with 6 decimals (like USDC) that this service mints itself on
devnet, because devnet USDC can only be obtained by hand from a faucet. Its mint address is derived from the
payer key, so the service stays stateless: after a restart it finds (or recreates) the same token.
"""

from __future__ import annotations

import base64
import hashlib
import json
import threading
import time
from datetime import datetime, timezone

import requests
from solders.hash import Hash
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.system_program import CreateAccountParams, create_account
from solders.token.associated import get_associated_token_address
from solders.transaction import Transaction

from .chain import ChainError, ChainNotConfigured, FoundTransfer, PaymentNotSent, SentPayment, TxInfo
from .memo import cents_to_units, encode_reference

DEFAULT_RPC = "https://api.devnet.solana.com"
CLUSTER = "devnet"
DECIMALS = 6  # same as USDC, so USD cents map to base units exactly like on Tempo (cents * 10_000)

SYSTEM_PROGRAM = Pubkey.from_string("11111111111111111111111111111111")
TOKEN_PROGRAM = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
MEMO_PROGRAM = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

MINT_ACCOUNT_SIZE = 82
MIN_PAYER_LAMPORTS = 50_000_000  # 0.05 SOL: below this we ask the faucet for more
MIN_TO_SEND_LAMPORTS = 10_000_000  # 0.01 SOL: enough for fees plus the rent of a few new token accounts
AIRDROP_LAMPORTS = 2_000_000_000  # 2 SOL, the devnet faucet maximum
TOPUP_UNITS = 2_000_000 * 10**DECIMALS  # test tokens minted when the payer runs low
MAX_WAIT_SECONDS = 45


class SolanaRpc:
    """Minimal JSON-RPC client. Kept tiny on purpose so tests can swap it for a fake with the same `call`."""

    def __init__(self, url: str = DEFAULT_RPC, timeout: float = 30, session: requests.Session | None = None):
        self.url = url
        self.timeout = timeout
        self._session = session or requests.Session()
        self._id = 0

    def call(self, method: str, params: list | None = None):
        self._id += 1
        try:
            res = self._session.post(
                self.url,
                json={"jsonrpc": "2.0", "id": self._id, "method": method, "params": params or []},
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise ChainError(f"Could not reach the Solana RPC: {exc}") from exc
        if res.status_code == 429:
            raise ChainError("The public Solana devnet RPC is rate limiting this service. Try again in a moment.")
        try:
            body = res.json()
        except ValueError as exc:
            raise ChainError(f"The Solana RPC answered HTTP {res.status_code} with something that is not JSON") from exc
        if "error" in body:
            raise ChainError(f"Solana RPC {method}: {body['error'].get('message', body['error'])}")
        return body.get("result")


# ----- instruction builders (the SPL programs are simple enough to encode by hand) -----


def create_ata_idempotent(payer: Pubkey, owner: Pubkey, mint: Pubkey) -> Instruction:
    """Create the owner's associated token account for `mint` unless it already exists."""
    ata = get_associated_token_address(owner, mint)
    return Instruction(
        ASSOCIATED_TOKEN_PROGRAM,
        bytes([1]),
        [
            AccountMeta(payer, True, True),
            AccountMeta(ata, False, True),
            AccountMeta(owner, False, False),
            AccountMeta(mint, False, False),
            AccountMeta(SYSTEM_PROGRAM, False, False),
            AccountMeta(TOKEN_PROGRAM, False, False),
        ],
    )


def transfer_checked(source: Pubkey, mint: Pubkey, dest: Pubkey, authority: Pubkey, amount: int) -> Instruction:
    data = bytes([12]) + amount.to_bytes(8, "little") + bytes([DECIMALS])
    return Instruction(
        TOKEN_PROGRAM,
        data,
        [
            AccountMeta(source, False, True),
            AccountMeta(mint, False, False),
            AccountMeta(dest, False, True),
            AccountMeta(authority, True, False),
        ],
    )


def mint_to(mint: Pubkey, dest: Pubkey, authority: Pubkey, amount: int) -> Instruction:
    data = bytes([7]) + amount.to_bytes(8, "little")
    return Instruction(
        TOKEN_PROGRAM,
        data,
        [AccountMeta(mint, False, True), AccountMeta(dest, False, True), AccountMeta(authority, True, False)],
    )


def initialize_mint2(mint: Pubkey, authority: Pubkey) -> Instruction:
    data = bytes([20, DECIMALS]) + bytes(authority) + bytes([0])  # 0 = no freeze authority
    return Instruction(TOKEN_PROGRAM, data, [AccountMeta(mint, False, True)])


def memo_instruction(text: str, signer: Pubkey) -> Instruction:
    return Instruction(MEMO_PROGRAM, text.encode("utf-8"), [AccountMeta(signer, True, False)])


# ----- keys -----


def load_keypair(value: str) -> Keypair:
    """A base58 secret key, or the JSON array of 64 numbers that `solana-keygen` writes."""
    value = value.strip()
    if value.startswith("["):
        return Keypair.from_bytes(bytes(json.loads(value)))
    return Keypair.from_base58_string(value)


def derive_keypair(seed_material: str, purpose: str) -> Keypair:
    """A deterministic keypair for testnet use, so one configured secret is enough for every network."""
    return Keypair.from_seed(hashlib.sha256(f"seamoney/{purpose}/v1:{seed_material}".encode()).digest())


class SolanaService:
    def __init__(self, rpc: SolanaRpc | None = None, payer: Keypair | None = None):
        self.rpc = rpc or SolanaRpc()
        self._payer = payer
        self._mint_keypair = derive_keypair(bytes(payer).hex(), "test-usd-mint") if payer else None
        # one payment at a time from the payer: avoids blockhash/balance races between concurrent requests
        self._lock = threading.Lock()

    @classmethod
    def from_environment(cls, rpc_url: str, payer_secret: str | None, fallback_seed: str | None) -> "SolanaService":
        """Use SOLANA_PAYER_PRIVATE_KEY if given; otherwise derive a devnet key from the Tempo testnet key."""
        rpc = SolanaRpc(rpc_url)
        if payer_secret:
            return cls(rpc, load_keypair(payer_secret))
        if fallback_seed:
            return cls(rpc, derive_keypair(fallback_seed, "solana-payer"))
        return cls(rpc, None)

    # ----- identity -----

    @property
    def configured(self) -> bool:
        return self._payer is not None

    @property
    def address(self) -> str | None:
        return str(self._payer.pubkey()) if self._payer else None

    @property
    def mint(self) -> Pubkey | None:
        return self._mint_keypair.pubkey() if self._mint_keypair else None

    # ----- reads -----

    def health(self) -> dict:
        slot = int(self.rpc.call("getSlot", [{"commitment": "confirmed"}]))
        out = {
            "configured": self.configured,
            "payer_address": self.address,
            "cluster": CLUSTER,
            "token_mint": str(self.mint) if self.mint else None,
            "latest_slot": slot,
        }
        if self.configured and self._payer and self.mint:
            lamports = self._lamports(self._payer.pubkey())
            out["sol_balance"] = lamports / 1e9
            out["fee_balance"] = lamports / 1e9
            ata = get_associated_token_address(self._payer.pubkey(), self.mint)
            out["token_balance"] = self._token_balance(ata) / 10**DECIMALS
            out["needs_funding"] = lamports < MIN_TO_SEND_LAMPORTS  # fund the payer at https://faucet.solana.com
        return out

    def find_transfers(self, to: str, reference: str, from_block: int) -> list[FoundTransfer]:
        """Reconciliation primitive: transfers of our token to `to` that carry exactly this memo."""
        memo_bytes = encode_reference(reference)
        mint = self._require_mint()
        owner = _pubkey(to)
        ata = get_associated_token_address(owner, mint)

        entries = self.rpc.call("getSignaturesForAddress", [str(ata), {"limit": 100, "commitment": "confirmed"}]) or []
        found: list[FoundTransfer] = []
        for entry in entries:
            if entry.get("err") is not None or int(entry.get("slot", 0)) < max(0, int(from_block)):
                continue
            hint = entry.get("memo")  # the RPC shows the memo text of a transaction in the listing
            if hint is not None and reference not in hint:
                continue
            tx = self._get_transaction(entry["signature"])
            if tx is None or (tx.get("meta") or {}).get("err") is not None:
                continue
            found.extend(self._transfers_in(tx, entry["signature"], reference, memo_bytes, mint, ata, to))
        return found

    def get_events(self, token: str, from_cursor: str) -> list[FoundTransfer]:
        mint = _pubkey(token) if token else self._require_mint()
        options = {"limit": 100, "commitment": "confirmed"}
        if from_cursor and not from_cursor.isdigit():
            options["until"] = from_cursor

        entries = self.rpc.call("getSignaturesForAddress", [str(mint), options]) or []
        found: list[FoundTransfer] = []
        for entry in entries:
            if entry.get("err") is not None:
                continue
            if from_cursor.isdigit() and int(entry.get("slot", 0)) < int(from_cursor):
                continue
            tx = self._get_transaction(entry["signature"])
            if tx is None or (tx.get("meta") or {}).get("err") is not None:
                continue

            instructions = tx["transaction"]["message"]["instructions"]
            memos = [i.get("parsed") for i in instructions if i.get("program") == "spl-memo" or i.get("programId") == str(MEMO_PROGRAM)]
            if not memos:
                continue
            memo = str(memos[-1]) if isinstance(memos[-1], str) else ""

            balances = (tx.get("meta") or {}).get("postTokenBalances") or []
            ata_to_owner = {}
            keys = tx["transaction"]["message"]["accountKeys"]
            for b in balances:
                idx = b.get("accountIndex")
                if idx is not None and idx < len(keys):
                    key = keys[idx]
                    pubkey = key.get("pubkey") if isinstance(key, dict) else key
                    ata_to_owner[pubkey] = b.get("owner")

            for index, ins in enumerate(instructions):
                parsed = ins.get("parsed")
                if ins.get("program") != "spl-token" or not isinstance(parsed, dict) or parsed.get("type") != "transferChecked":
                    continue
                info = parsed["info"]
                if info.get("mint") != str(mint):
                    continue
                dest = info.get("destination") or ""
                owner = ata_to_owner.get(dest) or dest
                
                found.append(
                    FoundTransfer(
                        tx_hash=entry["signature"],
                        log_index=index,
                        block_number=int(tx["slot"]),
                        from_address=info.get("authority") or info.get("multisigAuthority") or "",
                        to_address=owner,
                        amount_units=int(info["tokenAmount"]["amount"]),
                        memo_hex="0x" + memo.encode().hex(),
                    )
                )
        return found

    def transaction_info(self, signature: str) -> TxInfo | None:
        tx = self._get_transaction(signature)
        if tx is None:
            return None
        block_time = tx.get("blockTime")
        stamp = datetime.fromtimestamp(int(block_time), tz=timezone.utc) if block_time else datetime.now(tz=timezone.utc)
        return TxInfo(
            status="success" if (tx.get("meta") or {}).get("err") is None else "reverted",
            block_number=int(tx["slot"]),
            timestamp=stamp.isoformat(),
        )

    # ----- writes -----

    def send_payment(self, to: str, amount_cents: int, reference: str) -> SentPayment:
        if self._payer is None:
            raise ChainNotConfigured("No Solana payer key: set SOLANA_PAYER_PRIVATE_KEY or TEMPO_PARTNER_PRIVATE_KEY")
        recipient = _pubkey(to)
        amount = cents_to_units(amount_cents)
        if amount <= 0:
            raise ValueError("Amount must be greater than zero")
        memo = encode_reference(reference).rstrip(b"\0").decode("utf-8")  # validates the 32-byte limit

        payer = self._payer.pubkey()
        mint = self._require_mint()
        source = get_associated_token_address(payer, mint)
        dest = get_associated_token_address(recipient, mint)

        with self._lock:
            self._ensure_ready(amount)
            instructions = [
                create_ata_idempotent(payer, recipient, mint),
                transfer_checked(source, mint, dest, payer, amount),
                memo_instruction(memo, payer),
            ]
            started = time.monotonic()
            signature, slot = self._send_and_confirm(instructions, [self._payer])
            confirm_ms = int((time.monotonic() - started) * 1000)

        return SentPayment(
            tx_hash=signature,
            block_number=slot,
            confirm_ms=confirm_ms,
            memo_hex="0x" + encode_reference(reference).hex(),
            from_address=str(payer),
        )

    # ----- internals -----

    def _require_mint(self) -> Pubkey:
        if self._mint_keypair is None:
            raise ChainNotConfigured("No Solana payer key: set SOLANA_PAYER_PRIVATE_KEY or TEMPO_PARTNER_PRIVATE_KEY")
        return self._mint_keypair.pubkey()

    def _lamports(self, address: Pubkey) -> int:
        return int(self.rpc.call("getBalance", [str(address), {"commitment": "confirmed"}])["value"])

    def _get_transaction(self, signature: str) -> dict | None:
        return self.rpc.call(
            "getTransaction",
            [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0, "commitment": "confirmed"}],
        )

    def _transfers_in(self, tx: dict, signature: str, reference: str, memo_bytes: bytes, mint: Pubkey, ata: Pubkey, owner: str):
        instructions = tx["transaction"]["message"]["instructions"]
        memos = [i.get("parsed") for i in instructions if i.get("program") == "spl-memo" or i.get("programId") == str(MEMO_PROGRAM)]
        if not any(isinstance(m, str) and m == reference for m in memos):
            return []
        out = []
        for index, ins in enumerate(instructions):
            parsed = ins.get("parsed")
            if ins.get("program") != "spl-token" or not isinstance(parsed, dict) or parsed.get("type") != "transferChecked":
                continue
            info = parsed["info"]
            if info.get("mint") != str(mint) or info.get("destination") != str(ata):
                continue
            out.append(
                FoundTransfer(
                    tx_hash=signature,
                    log_index=index,
                    block_number=int(tx["slot"]),
                    from_address=info.get("authority") or info.get("multisigAuthority") or "",
                    to_address=owner,
                    amount_units=int(info["tokenAmount"]["amount"]),
                    memo_hex="0x" + memo_bytes.hex(),
                )
            )
        return out

    def _send_and_confirm(self, instructions: list[Instruction], signers: list[Keypair]) -> tuple[str, int]:
        blockhash = Hash.from_string(
            self.rpc.call("getLatestBlockhash", [{"commitment": "confirmed"}])["value"]["blockhash"]
        )
        message = Message.new_with_blockhash(instructions, signers[0].pubkey(), blockhash)
        tx = Transaction(signers, message, blockhash)
        encoded = base64.b64encode(bytes(tx)).decode()
        try:
            signature = self.rpc.call(
                "sendTransaction",
                [encoded, {"encoding": "base64", "preflightCommitment": "confirmed", "maxRetries": 3}],
            )
        except ChainError as exc:
            raise ChainError(f"The Solana network rejected the transfer: {exc}") from exc
        return signature, self._wait_confirmed(signature)

    def _wait_confirmed(self, signature: str) -> int:
        deadline = time.monotonic() + MAX_WAIT_SECONDS
        while time.monotonic() < deadline:
            statuses = self.rpc.call("getSignatureStatuses", [[signature], {"searchTransactionHistory": True}])["value"]
            status = statuses[0] if statuses else None
            if status is not None:
                if status.get("err") is not None:
                    raise ChainError(f"The transfer failed on-chain: {status['err']}")
                if status.get("confirmationStatus") in ("confirmed", "finalized"):
                    return int(status["slot"])
            time.sleep(0.4)
        raise ChainError(f"Could not confirm the transfer in time (signature {signature})")

    def _ensure_ready(self, needed_units: int) -> None:
        """Devnet only: fund the payer, create the test token and mint test tokens when any of them is missing."""
        payer = self._payer.pubkey()
        mint = self._mint_keypair.pubkey()
        lamports = self._lamports(payer)
        if lamports < MIN_PAYER_LAMPORTS:
            try:
                self._airdrop(payer)
            except ChainError:
                # the public faucet is often rate limited: keep going while there is still enough for fees and rent
                if lamports < MIN_TO_SEND_LAMPORTS:
                    raise
        if self.rpc.call("getAccountInfo", [str(mint), {"encoding": "base64", "commitment": "confirmed"}])["value"] is None:
            self._create_mint()
        if self._token_balance(get_associated_token_address(payer, mint)) < needed_units:
            self._mint_test_tokens(TOPUP_UNITS)

    def _token_balance(self, token_account: Pubkey) -> int:
        try:
            value = self.rpc.call("getTokenAccountBalance", [str(token_account), {"commitment": "confirmed"}])["value"]
        except ChainError as exc:
            if "could not find account" in str(exc).lower() or "invalid param" in str(exc).lower():
                return 0
            raise
        return int(value["amount"])

    def _airdrop(self, address: Pubkey) -> None:
        last: Exception | None = None
        for attempt in range(4):
            try:
                signature = self.rpc.call("requestAirdrop", [str(address), AIRDROP_LAMPORTS, {"commitment": "confirmed"}])
                self._wait_confirmed(signature)
                return
            except ChainError as exc:
                last = exc
                time.sleep(2 + attempt * 2)
        # still before anything was sent: the payment did not happen
        raise PaymentNotSent(
            f"The Solana devnet faucet did not fund {address} ({last}). "
            "Fund it by hand at https://faucet.solana.com and try again."
        )

    def _create_mint(self) -> None:
        payer = self._payer.pubkey()
        mint = self._mint_keypair.pubkey()
        rent = int(self.rpc.call("getMinimumBalanceForRentExemption", [MINT_ACCOUNT_SIZE]))
        instructions = [
            create_account(
                CreateAccountParams(from_pubkey=payer, to_pubkey=mint, lamports=rent, space=MINT_ACCOUNT_SIZE, owner=TOKEN_PROGRAM)
            ),
            initialize_mint2(mint, payer),
        ]
        self._send_and_confirm(instructions, [self._payer, self._mint_keypair])

    def _mint_test_tokens(self, units: int) -> None:
        payer = self._payer.pubkey()
        mint = self._mint_keypair.pubkey()
        ata = get_associated_token_address(payer, mint)
        self._send_and_confirm([create_ata_idempotent(payer, payer, mint), mint_to(mint, ata, payer, units)], [self._payer])


def _pubkey(value: str) -> Pubkey:
    try:
        key = Pubkey.from_string(value)
    except Exception as exc:  # solders raises its own error types for bad base58 or wrong length
        raise ValueError("Not a valid Solana address") from exc
    return key
