import pytest

from app.memo import (
    address_topic,
    cents_to_units,
    decode_reference,
    encode_reference,
    topic_to_address,
)


def test_reference_is_right_padded_to_32_bytes():
    memo = encode_reference("INV-2026-0845")
    assert len(memo) == 32
    assert memo.startswith(b"INV-2026-0845")
    assert memo[len("INV-2026-0845"):] == b"\0" * (32 - len("INV-2026-0845"))


def test_reference_round_trip():
    assert decode_reference(encode_reference("INV-E2E-010735")) == "INV-E2E-010735"


def test_matches_the_typescript_encoding_used_in_the_first_smoke_test():
    # From the first on-chain test: toHex('INV-E2E-010735', { size: 32 })
    assert encode_reference("INV-E2E-010735").hex() == "494e562d4532452d303130373335" + "00" * 18


def test_limit_is_32_bytes_not_32_characters():
    encode_reference("a" * 32)
    with pytest.raises(ValueError):
        encode_reference("a" * 33)
    with pytest.raises(ValueError):
        encode_reference("é" * 17)  # 17 characters, 34 bytes


def test_empty_reference_is_rejected():
    with pytest.raises(ValueError):
        encode_reference("")


def test_address_topic_is_left_padded_and_reversible():
    addr = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0"
    topic = address_topic(addr)
    assert len(topic) == 66
    assert topic.endswith(addr[2:].lower())
    assert topic_to_address(topic).lower() == addr.lower()


def test_invalid_address_is_rejected():
    with pytest.raises(ValueError):
        address_topic("0x1234")


def test_cents_to_units():
    assert cents_to_units(8_000_000) == 80_000_000_000
    with pytest.raises(ValueError):
        cents_to_units(-1)
