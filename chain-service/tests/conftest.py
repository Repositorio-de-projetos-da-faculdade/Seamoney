import sys
from pathlib import Path

# make `import app` work when pytest is started from the chain-service folder
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


import pytest


@pytest.fixture(autouse=True)
def _idempotency_file_in_tmp(tmp_path, monkeypatch):
    """Tests never write the real idempotency file (chain-service/data) and start from an empty record."""
    from app.idempotency import store

    monkeypatch.setattr(store, "filepath", str(tmp_path / "idempotency.json"))
    store.store.clear()
    yield
    store.store.clear()
