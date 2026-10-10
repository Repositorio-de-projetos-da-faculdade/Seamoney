"""Smoke test against the real Tempo testnet: send one payment with a memo, then find it again by memo.

    python -m scripts.smoke
"""

import os
import re
import time
from pathlib import Path

from eth_account import Account

from app.chain import DEFAULT_RPC, ChainService


def load_key() -> str:
    key = os.environ.get("TEMPO_PARTNER_PRIVATE_KEY")
    if key:
        return key
    text = Path(".env").read_text()
    return re.search(r"^TEMPO_PARTNER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$", text, re.M).group(1)


def main() -> None:
    service = ChainService(rpc_url=DEFAULT_RPC, private_key=load_key())
    supplier = Account.create().address
    reference = "SMN-PY-" + format(int(time.time()), "X")
    print("supplier:", supplier, "| reference:", reference)

    sent = service.send_payment(supplier, 8_000_000, reference)  # US$ 80,000
    print("sent:", sent)

    found = service.find_transfers(supplier, reference, sent.block_number - 5)
    print("events found by memo:", len(found))
    for t in found:
        print(t)
    assert len(found) == 1 and found[0].tx_hash == sent.tx_hash, "reconciliation primitive failed"
    info = service.transaction_info(sent.tx_hash)
    print("transaction:", info)
    assert info and info.status == "success"
    print("OK")


if __name__ == "__main__":
    main()
