"""Everything that touches the Tempo blockchain lives in this file.

Follows Tempo's Python guide (pytempo + web3): a TempoTransaction carrying a TIP-20
`transferWithMemo` call, and the indexed `TransferWithMemo` event to find a payment again.
Testnet only (Moderato, chain id 42431).
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from pytempo import TempoTransaction
from pytempo.contracts import TIP20
from web3 import Web3
from web3.exceptions import TransactionNotFound

from .memo import address_topic, cents_to_units, encode_reference, topic_to_address

ALPHA_USD = "0x20c0000000000000000000000000000000000001"
CHAIN_ID = 42431
DEFAULT_RPC = "https://rpc.moderato.tempo.xyz"
# keccak256("TransferWithMemo(address,address,uint256,bytes32)"): from, to and memo are indexed
TRANSFER_WITH_MEMO_TOPIC = "0x57bc7354aa85aed339e000bccffabbc529466af35f0772c8f8ee1145927de7f0"
FEE_BUFFER_UNITS = 5_000_000  # 5 AlphaUSD kept for transaction fees

_BALANCE_ABI = [
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    }
]


class ChainNotConfigured(Exception):
    """No partner private key was provided."""


class ChainError(Exception):
    """The chain rejected or failed to confirm something."""


@dataclass(frozen=True)
class SentPayment:
    tx_hash: str
    block_number: int
    confirm_ms: int
    memo_hex: str
    from_address: str


@dataclass(frozen=True)
class FoundTransfer:
    tx_hash: str
    log_index: int
    block_number: int
    from_address: str
    to_address: str
    amount_units: int
    memo_hex: str


@dataclass(frozen=True)
class TxInfo:
    status: str  # "success" | "reverted"
    block_number: int
    timestamp: str  # ISO-8601 UTC


class ChainService:
    def __init__(
        self,
        rpc_url: str = DEFAULT_RPC,
        private_key: str | None = None,
        gas_limit: int = 500_000,
        w3: Web3 | None = None,
    ):
        self.w3 = w3 or Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
        self._private_key = private_key
        self._account = self.w3.eth.account.from_key(private_key) if private_key else None
        self._gas_limit = gas_limit
        # one payment at a time from the partner wallet: avoids nonce clashes between concurrent requests
        self._lock = threading.Lock()

    # ----- identity -----

    @property
    def configured(self) -> bool:
        return self._account is not None

    @property
    def address(self) -> str | None:
        return self._account.address if self._account else None

    # ----- reads -----

    def balance_units(self, address: str) -> int:
        token = self.w3.eth.contract(address=Web3.to_checksum_address(ALPHA_USD), abi=_BALANCE_ABI)
        return int(token.functions.balanceOf(Web3.to_checksum_address(address)).call())

    def health(self) -> dict:
        out = {
            "configured": self.configured,
            "partner_address": self.address,
            "chain_id": int(self.w3.eth.chain_id),
            "latest_block": int(self.w3.eth.block_number),
        }
        if self.configured and self.address:
            out["token_balance"] = self.balance_units(self.address) / 1_000_000  # assuming 6 decimals
            out["fee_balance"] = self.w3.eth.get_balance(self.address) / 10**18
        return out

    def find_transfers(self, to: str, reference: str, from_block: int) -> list[FoundTransfer]:
        """Reconciliation primitive: transfers to `to` that carry exactly this memo."""
        memo = encode_reference(reference)
        logs = self.w3.eth.get_logs(
            {
                "address": Web3.to_checksum_address(ALPHA_USD),
                "fromBlock": max(0, int(from_block)),
                "toBlock": "latest",
                "topics": [TRANSFER_WITH_MEMO_TOPIC, None, address_topic(to), "0x" + memo.hex()],
            }
        )
        return self._parse_transfer_logs(logs)

    def get_events(self, token: str, from_block: int) -> list[FoundTransfer]:
        """Fetch all memo transfers for the event worker."""
        logs = self.w3.eth.get_logs(
            {
                "address": Web3.to_checksum_address(token) if token else Web3.to_checksum_address(ALPHA_USD),
                "fromBlock": max(0, int(from_block)),
                "toBlock": "latest",
                "topics": [TRANSFER_WITH_MEMO_TOPIC],
            }
        )
        return self._parse_transfer_logs(logs)

    def _parse_transfer_logs(self, logs) -> list[FoundTransfer]:
        found: list[FoundTransfer] = []
        for log in logs:
            data = log["data"]
            amount = int(data.hex() if hasattr(data, "hex") else str(data), 16)
            found.append(
                FoundTransfer(
                    tx_hash=_hex(log["transactionHash"]),
                    log_index=int(log["logIndex"]),
                    block_number=int(log["blockNumber"]),
                    from_address=Web3.to_checksum_address(topic_to_address(log["topics"][1])),
                    to_address=Web3.to_checksum_address(topic_to_address(log["topics"][2])),
                    amount_units=amount,
                    memo_hex=_hex(log["topics"][3]),
                )
            )
        return found

    def transaction_info(self, tx_hash: str) -> TxInfo | None:
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
        except TransactionNotFound:
            return None
        block = self.w3.eth.get_block(receipt["blockNumber"])
        return TxInfo(
            status="success" if receipt["status"] == 1 else "reverted",
            block_number=int(receipt["blockNumber"]),
            timestamp=datetime.fromtimestamp(int(block["timestamp"]), tz=timezone.utc).isoformat(),
        )

    # ----- writes -----

    def send_payment(self, to: str, amount_cents: int, reference: str) -> SentPayment:
        if self._account is None or self._private_key is None:
            raise ChainNotConfigured("TEMPO_PARTNER_PRIVATE_KEY is not set")
        recipient = Web3.to_checksum_address(to)
        amount = cents_to_units(amount_cents)
        if amount <= 0:
            raise ValueError("Amount must be greater than zero")
        memo = encode_reference(reference)

        with self._lock:
            self._ensure_funds(amount)
            started = time.monotonic()
            call = TIP20(ALPHA_USD).transfer_with_memo(to=recipient, amount=amount, memo=memo)
            tx = TempoTransaction.create(**self._tx_options(), calls=(call,))
            signed = tx.sign(self._private_key)
            try:
                tx_hash = self.w3.eth.send_raw_transaction(signed.encode())
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30, poll_latency=0.1)
            except Exception as exc:  # network or RPC failure: surface it, do not guess
                raise ChainError(f"Could not confirm the transfer: {exc}") from exc
            confirm_ms = int((time.monotonic() - started) * 1000)

        if receipt["status"] != 1:
            raise ChainError("The transfer was reverted on-chain")
        return SentPayment(
            tx_hash=_hex(receipt["transactionHash"]),
            block_number=int(receipt["blockNumber"]),
            confirm_ms=confirm_ms,
            memo_hex="0x" + memo.hex(),
            from_address=self._account.address,
        )

    # ----- internals -----

    def _tx_options(self) -> dict:
        chain_id = int(self.w3.eth.chain_id)
        if chain_id != CHAIN_ID:
            raise ChainError(f"Expected Tempo Moderato testnet ({CHAIN_ID}), got {chain_id}")
        gas_price = self.w3.eth.gas_price
        return {
            "chain_id": chain_id,
            "nonce": self.w3.eth.get_transaction_count(self._account.address, "pending"),
            "gas_limit": self._gas_limit,
            "max_fee_per_gas": gas_price * 2,
            "max_priority_fee_per_gas": gas_price,
            "fee_token": ALPHA_USD,
        }

    def _ensure_funds(self, needed_units: int) -> None:
        """Testnet only: top the partner wallet up from the public faucet when it runs low."""
        for _ in range(3):
            if self.balance_units(self._account.address) >= needed_units + FEE_BUFFER_UNITS:
                return
            self.w3.provider.make_request("tempo_fundAddress", [self._account.address])
            time.sleep(3)
        raise ChainError("The partner test wallet has insufficient funds and the faucet did not refill it")


def _hex(value) -> str:
    text = value.hex() if hasattr(value, "hex") else str(value)
    return text if text.startswith("0x") else "0x" + text
