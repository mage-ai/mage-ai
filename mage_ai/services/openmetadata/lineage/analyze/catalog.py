"""Column catalog abstraction used for ``SELECT *`` expansion and validation."""

from __future__ import annotations

from typing import Protocol

from ..ir import TableRef


class ColumnCatalog(Protocol):
    def columns(self, table: TableRef) -> list[str] | None:
        """Return known column names, or None when the table is not in the catalog."""


class NullCatalog:
    """Offline catalog: no column knowledge, table-level lineage still works."""

    def columns(self, table: TableRef) -> list[str] | None:
        return None


class DictCatalog:
    """In-memory catalog for tests and golden files.

    Keys are matched against ``db.schema.table``, ``schema.table`` and ``table``,
    case-insensitively.
    """

    def __init__(self, mapping: dict[str, list[str]]):
        self._map = {self._normalise(key): list(value) for key, value in mapping.items()}

    @staticmethod
    def _normalise(value: str) -> str:
        return value.strip().strip('"').strip("`").lower()

    def columns(self, table: TableRef) -> list[str] | None:
        keys = [
            ".".join(part for part in (table.database, table.schema, table.table) if part),
            ".".join(part for part in (table.schema, table.table) if part),
            table.table,
        ]
        for key in keys:
            hit = self._map.get(self._normalise(key))
            if hit is not None:
                return hit
        return None
