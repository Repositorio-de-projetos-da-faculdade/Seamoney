"""The idempotency records of the payments this service sent, kept in one JSON file.

Two properties matter, because a mistake here means paying a supplier twice:
  - `claim` is atomic: of two requests with the same key, exactly one is told it created the record and may send.
  - the file is replaced atomically (write a temp file, fsync, rename), so a crash never leaves half a file that
    would be read as "no payments yet".
"""

import json
import logging
import os
import threading
import time
from typing import Any, Dict, Optional, Tuple

log = logging.getLogger("seamoney.chain")


class IdempotencyStore:
    def __init__(self, data_dir: str = "data"):
        self.filepath = os.path.join(data_dir, "idempotency.json")
        self.lock = threading.Lock()
        self.store: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.filepath):
            return
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                self.store = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Do not guess and do not overwrite: keep the unreadable file for a person to look at, and say so loudly.
            aside = f"{self.filepath}.corrupt-{int(time.time())}"
            os.replace(self.filepath, aside)
            log.error("The idempotency file was unreadable; moved to %s. Payments sent before that are not remembered.", aside)
            self.store = {}

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.filepath) or ".", exist_ok=True)
        tmp = f"{self.filepath}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.store, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, self.filepath)

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            entry = self.store.get(key)
            return dict(entry) if entry is not None else None

    def claim(self, key: str, body: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
        """Records the key as pending unless it already exists. Returns (record, created)."""
        with self.lock:
            existing = self.store.get(key)
            if existing is not None:
                return dict(existing), False
            entry = {
                "status": "pending",
                "body": body,
                "result": None,
                "error_code": 500,
                "error_detail": "",
                "created_at": time.time(),
            }
            self.store[key] = entry
            self._save()
            return dict(entry), True

    def set(
        self,
        key: str,
        status: str,
        body: Dict[str, Any],
        result: Optional[Dict[str, Any]] = None,
        error_code: int = 500,
        error_detail: str = "",
        created_at: Optional[float] = None,
    ) -> None:
        with self.lock:
            previous = self.store.get(key) or {}
            self.store[key] = {
                "status": status,
                "body": body,
                "result": result,
                "error_code": error_code,
                "error_detail": error_detail,
                # when the first attempt began: it dates a pending payment
                "created_at": created_at if created_at is not None else previous.get("created_at", time.time()),
            }
            self._save()


store = IdempotencyStore()
