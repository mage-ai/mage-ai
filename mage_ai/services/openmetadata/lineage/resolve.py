"""Resolve pipeline table references to OpenMetadata entities.

OpenMetadata is the only catalog: nothing is discovered from the database and nothing
is created. Candidate FQNs are generated from the profile mapping and checked against
the catalog; exactly one hit wins, and its canonical FQN is used from then on.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from .config import Config, ProfileConfig
from .ir import Resolution, ResolvedTable, TableRef
from .omd import AuthError, OmdClient, OmdError, TransientError

CASES = {"preserve", "lower", "upper"}


@dataclass
class _CacheEntry:
    value: Resolution
    expires_at: float


class Resolver:
    def __init__(
        self,
        config: Config,
        client: OmdClient | None = None,
        offline: bool = False,
    ):
        self.config = config
        self.client = client
        self.offline = offline or client is None
        self._cache: dict[str, _CacheEntry] = {}
        self._service_cache: dict[str, str | None] = {}
        self.issues: list[Any] = []

    # -- public ----------------------------------------------------------
    def resolve(self, table: TableRef) -> Resolution:
        key = f"{table.profile}:{table.raw}"
        entry = self._cache.get(key)
        now = time.monotonic()
        if entry is not None and entry.expires_at > now:
            return entry.value

        resolution = self._resolve(table)
        ttl = max(0, self.config.openmetadata.catalog.cache_ttl)
        self._cache[key] = _CacheEntry(value=resolution, expires_at=now + ttl)
        return resolution

    def columns(self, table: TableRef) -> list[str] | None:
        resolution = self.resolve(table)
        if resolution.resolved is None:
            return None
        return resolution.resolved.columns or None

    def clear_cache(self) -> None:
        """Forget lookups so a retry sees catalog changes made since the last run."""
        self._cache.clear()
        self._service_cache.clear()

    # -- internals -------------------------------------------------------
    def _resolve(self, table: TableRef) -> Resolution:
        override = self._registry_override(table)
        if override is not None:
            return override

        profile = self.config.profile(table.profile)
        if not profile.service:
            return Resolution(
                requested=table,
                status="unresolved",
                message=(
                    f"Profile '{profile.name}' has no OpenMetadata service configured; "
                    "set profiles.<name>.service"
                ),
            )

        candidates = self._candidates(table, profile)
        if not candidates:
            return Resolution(
                requested=table,
                status="unresolved",
                message=(
                    f"Table '{table.raw}' has no schema; set data_provider_schema on the block "
                    f"or profiles.{profile.name}.default_schema"
                ),
            )

        if self.offline:
            return Resolution(
                requested=table,
                status="offline",
                candidates=candidates,
                message="Offline mode: candidates were not checked against OpenMetadata",
            )

        service_type = self._service_type(profile.service)
        if service_type is None:
            return Resolution(
                requested=table,
                status="missing",
                candidates=candidates,
                message=(
                    f"OpenMetadata database service '{profile.service}' was not found; "
                    "run database metadata ingestion first"
                ),
            )

        hits: list[dict[str, Any]] = []
        for candidate in candidates:
            try:
                record = self.client.get_table(candidate)
            except (AuthError, TransientError):
                # Auth and transport failures are fatal for the lineage job, not a gap.
                raise
            except OmdError as exc:
                return Resolution(
                    requested=table,
                    status="unresolved",
                    candidates=candidates,
                    message=str(exc),
                )
            if record is not None:
                hits.append(record)

        if not hits:
            return Resolution(
                requested=table,
                status="missing",
                candidates=candidates,
                message=(
                    f"Table '{table.raw}' was not found in OpenMetadata "
                    f"(service '{profile.service}'); run metadata ingestion, then re-run lineage"
                ),
            )
        if len(hits) > 1:
            return Resolution(
                requested=table,
                status="ambiguous",
                candidates=[hit.get("fullyQualifiedName", "") for hit in hits],
                message=(
                    f"Table '{table.raw}' matches multiple OpenMetadata tables; add a "
                    "dataset_registry entry"
                ),
            )

        record = hits[0]
        resolved = ResolvedTable(
            table=table,
            fqn=record.get("fullyQualifiedName") or candidates[0],
            uuid=record.get("id") or "",
            columns=[column.get("name", "") for column in record.get("columns") or []],
        )
        return Resolution(requested=table, status="resolved", resolved=resolved)

    def _registry_override(self, table: TableRef) -> Resolution | None:
        registry = self.config.dataset_registry or {}
        keys = [str(table), table.raw.lower(), f"{table.profile}:{table.raw}"]
        for key in keys:
            if key in registry:
                value = registry[key]
                if isinstance(value, str):
                    fqn = value
                    columns: list[str] = []
                else:
                    fqn = value.get("fqn") or ""
                    columns = list(value.get("columns") or [])
                if self.offline:
                    return Resolution(
                        requested=table,
                        status="offline",
                        candidates=[fqn],
                        message="Offline mode: registry entry not verified",
                    )
                record = self.client.get_table(fqn) if self.client else None
                if record is None:
                    return Resolution(
                        requested=table,
                        status="missing",
                        candidates=[fqn],
                        message=f"dataset_registry entry '{fqn}' was not found in OpenMetadata",
                    )
                return Resolution(
                    requested=table,
                    status="resolved",
                    resolved=ResolvedTable(
                        table=table,
                        fqn=record.get("fullyQualifiedName") or fqn,
                        uuid=record.get("id") or "",
                        columns=[
                            column.get("name", "") for column in record.get("columns") or []
                        ]
                        or columns,
                    ),
                )
        return None

    def _candidates(self, table: TableRef, profile: ProfileConfig) -> list[str]:
        database = table.database or profile.database
        schema = table.schema or profile.default_schema
        if not database or not schema:
            return []
        service = profile.service or ""
        preferred = profile.case if profile.case in CASES else "preserve"
        order = [preferred] + [
            candidate for candidate in ("preserve", "lower", "upper") if candidate != preferred
        ]
        candidates: list[str] = []
        for mode in order:
            if profile.fqn:
                fqn = profile.fqn.format(
                    service=service,
                    database=_case(database, mode),
                    schema=_case(schema, mode),
                    table=_case(table.table, mode),
                )
            else:
                fqn = (
                    f"{service}.{_case(database, mode)}.{_case(schema, mode)}"
                    f".{_case(table.table, mode)}"
                )
            if fqn not in candidates:
                candidates.append(fqn)
        return candidates

    def _service_type(self, service: str) -> str | None:
        if service in self._service_cache:
            return self._service_cache[service]
        if self.client is None:
            return None
        try:
            record = self.client.get_database_service(service)
        except (AuthError, TransientError):
            raise
        except OmdError:
            return None
        service_type = None
        if record:
            service_type = record.get("serviceType") or record.get("connection", {}).get("type")
        self._service_cache[service] = service_type
        return service_type


def _case(value: str, mode: str) -> str:
    if mode == "lower":
        return value.lower()
    if mode == "upper":
        return value.upper()
    return value
