"""Payment references on Tempo are 32-byte memos (bytes, not characters), right-padded with zeros.

The same encoding must be used when sending and when searching, so it lives in one pure module.
"""

MEMO_SIZE = 32


def encode_reference(reference: str) -> bytes:
    raw = reference.encode("utf-8")
    if not raw:
        raise ValueError("The payment reference cannot be empty")
    if len(raw) > MEMO_SIZE:
        raise ValueError("Payment references must fit in 32 UTF-8 bytes")
    return raw.ljust(MEMO_SIZE, b"\0")


def decode_reference(memo: bytes) -> str:
    return memo.rstrip(b"\0").decode("utf-8", errors="replace")


def address_topic(address: str) -> str:
    """An indexed address as a 32-byte event topic (left-padded with zeros)."""
    body = address.lower().removeprefix("0x")
    if len(body) != 40 or any(c not in "0123456789abcdef" for c in body):
        raise ValueError("Not a valid address")
    return "0x" + "0" * 24 + body


def topic_to_address(topic: bytes | str) -> str:
    hex_str = topic.hex() if isinstance(topic, (bytes, bytearray)) else topic.removeprefix("0x")
    return "0x" + hex_str[-40:]


def cents_to_units(cents: int) -> int:
    """USD cents -> 6-decimal token base units."""
    if cents < 0:
        raise ValueError("Amount cannot be negative")
    return cents * 10_000
