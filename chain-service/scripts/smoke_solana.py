"""Smoke test against the real Solana devnet: pay a fresh wallet with a memo, then find the payment by memo.

    python -m scripts.smoke_solana

The payer is SOLANA_PAYER_PRIVATE_KEY, or a devnet key derived from TEMPO_PARTNER_PRIVATE_KEY (read from the
environment or from ./.env). The first run funds the payer from the devnet faucet and creates the test token.
"""

import os
import re
import time
from pathlib import Path

from solders.keypair import Keypair

from app.solana_chain import DEFAULT_RPC, SolanaService


def read_env(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    env = Path(".env")
    if env.exists():
        found = re.search(rf"^{name}=(\S+)$", env.read_text(), re.M)
        if found:
            return found.group(1)
    return None


def main() -> None:
    service = SolanaService.from_environment(
        os.environ.get("SOLANA_RPC_URL", DEFAULT_RPC),
        read_env("SOLANA_PAYER_PRIVATE_KEY"),
        read_env("TEMPO_PARTNER_PRIVATE_KEY"),
    )
    assert service.configured, "set SOLANA_PAYER_PRIVATE_KEY or TEMPO_PARTNER_PRIVATE_KEY"
    print("payer:", service.address, "| token mint:", service.mint)

    supplier = str(Keypair().pubkey())
    reference = "SMN-SOL-" + format(int(time.time()), "X")
    print("supplier:", supplier, "| reference:", reference)

    sent = service.send_payment(supplier, 8_000_000, reference)  # US$ 80,000
    print("sent:", sent)

    found = service.find_transfers(supplier, reference, sent.block_number - 5)
    print("transfers found by memo:", len(found))
    for t in found:
        print(t)
    assert len(found) == 1 and found[0].tx_hash == sent.tx_hash, "reconciliation primitive failed"
    assert found[0].amount_units == 80_000_000_000 and found[0].to_address == supplier

    info = service.transaction_info(sent.tx_hash)
    print("transaction:", info)
    assert info and info.status == "success"
    print("explorer: https://explorer.solana.com/tx/" + sent.tx_hash + "?cluster=devnet")
    print("OK")


if __name__ == "__main__":
    main()
