"""One-off setup: create the TESTNET partner wallet and fund it from the public faucet.

    python -m scripts.setup_wallets

The private key is written to .env (git-ignored) and never printed.
"""

import re
import time
from pathlib import Path

from eth_account import Account
from web3 import Web3

from app.chain import ALPHA_USD, DEFAULT_RPC, ChainService

ENV_PATH = Path(".env")


def main() -> None:
    text = ENV_PATH.read_text() if ENV_PATH.exists() else ""
    match = re.search(r"^TEMPO_PARTNER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$", text, re.M)
    if match:
        key = match.group(1)
    else:
        key = Account.create().key.hex()
        key = key if key.startswith("0x") else "0x" + key
        ENV_PATH.write_text(text + ("\n" if text and not text.endswith("\n") else "") + f"TEMPO_PARTNER_PRIVATE_KEY={key}\n")
        print("Created TEMPO_PARTNER_PRIVATE_KEY in .env")

    service = ChainService(rpc_url=DEFAULT_RPC, private_key=key)
    print("Partner wallet address:", service.address)
    print("AlphaUSD before:", service.balance_units(service.address) / 1e6)
    service.w3.provider.make_request("tempo_fundAddress", [service.address])
    time.sleep(4)
    print("AlphaUSD after: ", service.balance_units(service.address) / 1e6)
    print("Token:", Web3.to_checksum_address(ALPHA_USD))


if __name__ == "__main__":
    main()
