import json
import os
import threading
from typing import Optional, Dict, Any

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
            with open(self.filepath, "r") as f:
                self.store = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.store = {}

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w") as f:
            json.dump(self.store, f)

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.store.get(key)

    def set(self, key: str, status: str, body: Dict[str, Any], result: Optional[Dict[str, Any]] = None, error_code: int = 500, error_detail: str = "") -> None:
        with self.lock:
            self.store[key] = {
                "status": status,
                "body": body,
                "result": result,
                "error_code": error_code,
                "error_detail": error_detail
            }
            self._save()

store = IdempotencyStore()
