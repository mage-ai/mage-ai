"""Configuration loading and validation for ``omd_lineage.yaml``."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from .errors import ConfigError

ENV_PATTERN = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}")

TRIGGER_MODES = {"on_run", "on_change", "schedule", "manual"}
EMIT_POLICIES = {"resolvable", "all_or_nothing"}


def interpolate(value: Any) -> Any:
    """Recursively expand ``${VAR}`` and ``${VAR:-default}`` in strings."""
    if isinstance(value, str):

        def replace(match: re.Match[str]) -> str:
            name, default = match.group(1), match.group(2)
            if name in os.environ:
                return os.environ[name]
            if default is not None:
                return default
            raise ConfigError(f"Environment variable '{name}' is not set")

        return ENV_PATTERN.sub(replace, value)
    if isinstance(value, list):
        return [interpolate(item) for item in value]
    if isinstance(value, dict):
        return {key: interpolate(item) for key, item in value.items()}
    return value


@dataclass
class ProfileConfig:
    name: str
    service: str | None = None
    driver: str | None = None
    database: str | None = None
    default_schema: str | None = None
    case: str = "preserve"
    fqn: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, name: str, data: dict[str, Any]) -> "ProfileConfig":
        return cls(
            name=name,
            service=data.get("service"),
            driver=data.get("driver"),
            database=data.get("database"),
            default_schema=data.get("default_schema") or data.get("schema"),
            case=str(data.get("case", "preserve")).lower(),
            fqn=data.get("fqn"),
            extra=dict(data),
        )


@dataclass
class CatalogConfig:
    mode: str = "existing_only"
    fields: list[str] = field(default_factory=lambda: ["columns", "tags"])
    cache_ttl: int = 3600


@dataclass
class EmitConfig:
    batch_size: int = 50
    time_budget_ms: int = 5000
    prune: bool = False


@dataclass
class CoverageConfig:
    on_missing: str = "fail"
    on_ambiguous: str = "fail"
    on_column_missing: str = "fail"
    on_unmodelled_block: str = "warn"
    on_unsupported: str = "fail"
    emit: str = "resolvable"
    report_path: str | None = None


@dataclass
class UnresolvedConfig:
    spool: bool = True
    retry_after: str = "6h"


@dataclass
class ScheduleConfig:
    every: str | None = None
    window: str | None = None


@dataclass
class TriggerConfig:
    modes: list[str] = field(default_factory=lambda: ["on_run"])
    schedule: ScheduleConfig = field(default_factory=ScheduleConfig)
    watch: list[str] = field(
        default_factory=lambda: ["metadata", "block_code", "contracts", "profiles"]
    )
    retry_backoff: str | None = "6h"
    emit_on_unchanged: str = "status_only"

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "TriggerConfig":
        data = data or {}
        raw_modes = data.get("modes", data.get("mode", ["on_run"]))
        modes = [raw_modes] if isinstance(raw_modes, str) else list(raw_modes)
        invalid = [mode for mode in modes if mode not in TRIGGER_MODES]
        if invalid:
            raise ConfigError(
                f"Invalid trigger mode(s) {invalid}; expected one of {sorted(TRIGGER_MODES)}"
            )
        schedule_data = data.get("schedule") or {}
        return cls(
            modes=modes,
            schedule=ScheduleConfig(
                every=schedule_data.get("every"),
                window=schedule_data.get("window"),
            ),
            watch=list((data.get("on_change") or {}).get("watch") or []),
            retry_backoff=data.get("retry_backoff", "6h"),
            emit_on_unchanged=data.get("emit_on_unchanged", "status_only"),
        )


@dataclass
class BlockConfig:
    contract: dict[str, Any] | None = None
    sql_override: str | None = None
    dbt_model: str | None = None
    dbt_manifest: str | None = None
    skip: bool = False
    disabled: bool = False

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "BlockConfig":
        data = data or {}
        return cls(
            contract=data.get("contract"),
            sql_override=data.get("sql_override"),
            dbt_model=data.get("dbt_model"),
            dbt_manifest=data.get("dbt_manifest"),
            skip=bool(data.get("skip", False)),
            disabled=bool(data.get("disabled", False)),
        )


@dataclass
class PipelineConfig:
    uuid: str
    enabled: bool = False
    trigger: TriggerConfig = field(default_factory=TriggerConfig)
    owner: str | None = None
    tags: list[str] = field(default_factory=list)
    blocks: dict[str, BlockConfig] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, uuid: str, data: dict[str, Any]) -> "PipelineConfig":
        return cls(
            uuid=uuid,
            enabled=bool(data.get("enabled", False)),
            trigger=TriggerConfig.from_dict(data.get("trigger")),
            owner=data.get("owner"),
            tags=list(data.get("tags") or []),
            blocks={
                block_uuid: BlockConfig.from_dict(block)
                for block_uuid, block in (data.get("blocks") or {}).items()
            },
        )

    def block(self, block_uuid: str) -> BlockConfig:
        return self.blocks.get(block_uuid) or BlockConfig()

    def mode_enabled(self, mode: str) -> bool:
        return mode in self.trigger.modes


@dataclass
class OpenMetadataConfig:
    host: str | None = None
    token: str | None = None
    auth: str = "jwt"
    verify_tls: bool = True
    pipeline_service: str = "mage"
    source_url: str | None = None
    pipeline_name_template: str = "{project}__{pipeline}"
    custom_properties: str = "auto"
    catalog: CatalogConfig = field(default_factory=CatalogConfig)
    emit: EmitConfig = field(default_factory=EmitConfig)
    coverage: CoverageConfig = field(default_factory=CoverageConfig)
    unresolved: UnresolvedConfig = field(default_factory=UnresolvedConfig)
    timeout_seconds: int = 15


@dataclass
class MageConfig:
    project_uuid: str | None = None
    repo_path: str = "."
    api_base_url: str | None = None
    api_key: str | None = None


@dataclass
class DefaultsConfig:
    select_star: str = "expand_from_catalog"
    intermediate: str = "collapse"
    on_unmodelled_block: str = "warn"


@dataclass
class Config:
    path: Path
    mage: MageConfig = field(default_factory=MageConfig)
    openmetadata: OpenMetadataConfig = field(default_factory=OpenMetadataConfig)
    profiles: dict[str, ProfileConfig] = field(default_factory=dict)
    defaults: DefaultsConfig = field(default_factory=DefaultsConfig)
    pipelines: dict[str, PipelineConfig] = field(default_factory=dict)
    dataset_registry: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)

    # -- lookups ---------------------------------------------------------
    def profile(self, name: str | None) -> ProfileConfig:
        key = name or "default"
        if key in self.profiles:
            return self.profiles[key]
        if "default" in self.profiles:
            return self.profiles["default"]
        raise ConfigError(
            f"No profile '{key}' configured. Add profiles.{key} with service/database settings."
        )

    def pipeline(self, uuid: str) -> PipelineConfig:
        return self.pipelines.get(uuid) or PipelineConfig(uuid=uuid, enabled=False)

    def enabled_pipelines(self) -> list[PipelineConfig]:
        return [pipeline for pipeline in self.pipelines.values() if pipeline.enabled]

    def coverage(self, uuid: str) -> CoverageConfig:
        # Per-pipeline coverage overrides are not part of v1; single source of truth.
        return self.openmetadata.coverage

    @property
    def project_root(self) -> Path:
        return self.path.parent

    @property
    def repo_path(self) -> Path:
        candidate = Path(self.mage.repo_path)
        if not candidate.is_absolute():
            candidate = self.project_root / candidate
        return candidate.resolve()

    def report_path(self, default: Path) -> Path:
        configured = self.openmetadata.coverage.report_path
        if not configured:
            return default
        path = Path(configured)
        return path if path.is_absolute() else self.project_root / path

    # -- loading ---------------------------------------------------------
    @classmethod
    def load(cls, path: str | Path) -> "Config":
        config_path = Path(path).expanduser()
        if not config_path.is_absolute():
            config_path = Path.cwd() / config_path
        if not config_path.exists():
            raise ConfigError(f"Config file not found: {config_path}")
        raw = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        return cls.from_dict(raw, config_path)

    @classmethod
    def from_dict(cls, raw: dict[str, Any], path: Path) -> "Config":
        if not isinstance(raw, dict):
            raise ConfigError("Config root must be a mapping")
        data = interpolate(raw)

        mage_raw = data.get("mage") or {}
        omd_raw = data.get("openmetadata") or {}
        coverage_raw = omd_raw.get("coverage") or {}
        unresolved_raw = omd_raw.get("unresolved") or {}
        catalog_raw = omd_raw.get("catalog") or {}
        emit_raw = omd_raw.get("emit") or {}

        emit_policy = coverage_raw.get("emit", "resolvable")
        if emit_policy not in EMIT_POLICIES:
            raise ConfigError(f"coverage.emit must be one of {sorted(EMIT_POLICIES)}")

        config = cls(
            path=path,
            mage=MageConfig(
                project_uuid=mage_raw.get("project_uuid"),
                repo_path=mage_raw.get("repo_path", "."),
                api_base_url=(mage_raw.get("api") or {}).get("base_url"),
                api_key=(mage_raw.get("api") or {}).get("api_key"),
            ),
            openmetadata=OpenMetadataConfig(
                host=omd_raw.get("host"),
                token=omd_raw.get("token"),
                auth=omd_raw.get("auth", "jwt"),
                verify_tls=bool(omd_raw.get("verify_tls", True)),
                pipeline_service=omd_raw.get("pipeline_service", "mage"),
                source_url=omd_raw.get("source_url"),
                pipeline_name_template=omd_raw.get(
                    "pipeline_name_template", "{project}__{pipeline}"
                ),
                custom_properties=str(omd_raw.get("custom_properties", "auto")).lower(),
                catalog=CatalogConfig(
                    mode=catalog_raw.get("mode", "existing_only"),
                    fields=list((catalog_raw.get("lookup") or {}).get("fields") or ["columns"]),
                    cache_ttl=int((catalog_raw.get("lookup") or {}).get("cache_ttl", 3600)),
                ),
                emit=EmitConfig(
                    batch_size=int(emit_raw.get("batch_size", 50)),
                    time_budget_ms=int(emit_raw.get("time_budget_ms", 5000)),
                    prune=bool(emit_raw.get("prune", False)),
                ),
                coverage=CoverageConfig(
                    on_missing=coverage_raw.get("on_missing", "fail"),
                    on_ambiguous=coverage_raw.get("on_ambiguous", "fail"),
                    on_column_missing=coverage_raw.get("on_column_missing", "fail"),
                    on_unmodelled_block=coverage_raw.get("on_unmodelled_block", "warn"),
                    on_unsupported=coverage_raw.get("on_unsupported", "fail"),
                    emit=emit_policy,
                    report_path=coverage_raw.get("report_path"),
                ),
                unresolved=UnresolvedConfig(
                    spool=bool(unresolved_raw.get("spool", True)),
                    retry_after=str(unresolved_raw.get("retry_after", "6h")),
                ),
                timeout_seconds=int(omd_raw.get("timeout_seconds", 15)),
            ),
            profiles={
                name: ProfileConfig.from_dict(name, profile)
                for name, profile in (data.get("profiles") or {}).items()
            },
            defaults=DefaultsConfig(
                select_star=(data.get("defaults") or {}).get(
                    "select_star", "expand_from_catalog"
                ),
                intermediate=(data.get("defaults") or {}).get("intermediate", "collapse"),
                on_unmodelled_block=(data.get("defaults") or {}).get(
                    "on_unmodelled_block", "warn"
                ),
            ),
            pipelines={
                uuid: PipelineConfig.from_dict(uuid, pipeline)
                for uuid, pipeline in (data.get("pipelines") or {}).items()
            },
            dataset_registry=dict(data.get("dataset_registry") or {}),
            raw=data,
        )
        config._validate()
        return config

    def _validate(self) -> None:
        if not self.pipelines:
            return
        for pipeline in self.pipelines.values():
            if not pipeline.enabled:
                continue
            for block_uuid, block in pipeline.blocks.items():
                if block.contract and block.sql_override:
                    raise ConfigError(
                        f"pipelines.{pipeline.uuid}.blocks.{block_uuid} sets both "
                        "contract and sql_override; choose one"
                    )
