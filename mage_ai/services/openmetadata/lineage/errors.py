"""Error and issue types shared across the connector."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


class ConfigError(Exception):
    """Raised when the connector configuration is invalid."""


class FatalError(Exception):
    """Raised when the run cannot continue (auth, transport, bad config)."""


@dataclass
class Issue:
    """A single problem found while building or publishing lineage."""

    code: str
    message: str
    pipeline: str | None = None
    block: str | None = None
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "pipeline": self.pipeline,
            "block": self.block,
            "detail": self.detail,
        }


# Issue codes used across the connector.
UNSUPPORTED_PLATFORM = "unsupported_platform"
DELEGATED_PLATFORM = "delegated_platform"
SERVICE_NOT_FOUND = "service_not_found"
SERVICE_TYPE_MISMATCH = "service_type_mismatch"
MISSING_IN_CATALOG = "missing_in_catalog"
AMBIGUOUS_REFERENCE = "ambiguous_reference"
COLUMN_MISSING = "column_missing"
STAR_UNRESOLVED = "star_unresolved"
UNKNOWN_COLUMN = "unknown_column"
UNKNOWN_ALIAS = "unknown_alias"
AMBIGUOUS_COLUMN = "ambiguous_column"
UNMODELLED_BLOCK = "unmodelled_block"
UNSUPPORTED_STATEMENT = "unsupported_statement"
PARSE_ERROR = "parse_error"
CONTRACT_ERROR = "contract_error"
UNREACHABLE = "unreachable"
AUTH_ERROR = "auth_error"
SPOOLED = "spooled"
