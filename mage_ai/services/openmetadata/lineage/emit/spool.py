"""Durable spool for lineage that could not be published immediately."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class Spool:
    def __init__(self, directory: str | Path):
        self.directory = Path(directory)

    @property
    def path(self) -> Path:
        return self.directory / "lineage-spool.jsonl"

    def append(self, record: dict[str, Any]) -> Path:
        self.directory.mkdir(parents=True, exist_ok=True)
        payload = dict(record)
        payload.setdefault("spooled_at", datetime.now(timezone.utc).isoformat())
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, default=str) + "\n")
        return self.path

    def read_all(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        records = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return records

    def clear(self) -> None:
        if self.path.exists():
            self.path.unlink()

    def count(self) -> int:
        return len(self.read_all())
