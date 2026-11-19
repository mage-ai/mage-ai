"""Platform capability gate.

A pipeline is only eligible for lineage when every database it reads from or writes to
has an OpenMetadata database service that can ingest it. Everything else is reported
and skipped: retrying cannot help when OMD can never see the database.
"""

from __future__ import annotations

from dataclasses import dataclass
from importlib import resources
from typing import Any

import yaml

SUPPORTED = "supported"
DELEGATED = "delegated"
UNSUPPORTED = "unsupported"


@dataclass(frozen=True)
class Capability:
    driver: str
    platform: str | None
    state: str
    columns: str = "full"
    note: str | None = None

    @property
    def eligible(self) -> bool:
        return self.state == SUPPORTED


class CapabilityMap:
    def __init__(self, drivers: dict[str, dict[str, Any]], version: int = 1):
        self.version = version
        self._drivers = {key.lower(): value for key, value in drivers.items()}

    @classmethod
    def load(cls) -> "CapabilityMap":
        raw = resources.files(__package__).joinpath("platform_capabilities.yaml")
        data = yaml.safe_load(raw.read_text(encoding="utf-8")) or {}
        return cls(data.get("drivers") or {}, int(data.get("version", 1)))

    def lookup(self, driver: str | None) -> Capability:
        key = (driver or "").strip().lower()
        if not key:
            return Capability(
                driver=driver or "",
                platform=None,
                state=UNSUPPORTED,
                note="Block does not declare a data provider.",
            )
        entry = self._drivers.get(key)
        if entry is None:
            return Capability(
                driver=key,
                platform=None,
                state=UNSUPPORTED,
                note=f"Driver '{key}' is not in the capability map.",
            )
        return Capability(
            driver=key,
            platform=entry.get("platform"),
            state=entry.get("state", UNSUPPORTED),
            columns=entry.get("columns", "full"),
            note=entry.get("note"),
        )

    def as_rows(self) -> list[dict[str, Any]]:
        rows = []
        for driver, entry in sorted(self._drivers.items()):
            rows.append(
                {
                    "driver": driver,
                    "platform": entry.get("platform"),
                    "state": entry.get("state", UNSUPPORTED),
                    "columns": entry.get("columns", "full"),
                    "note": entry.get("note"),
                }
            )
        return rows
