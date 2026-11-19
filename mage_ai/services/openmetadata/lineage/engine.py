"""Orchestration: gate, analyse, resolve, report, emit."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import errors, __version__
from .analyze.catalog import ColumnCatalog, NullCatalog
from .capabilities import DELEGATED, SUPPORTED, UNSUPPORTED, CapabilityMap
from .config import Config
from .coverage import Coverage, build_coverage
from .emit.emitter import EmitResult, Emitter
from .emit.spool import Spool
from .fingerprint import pipeline_fingerprint
from .ir import (
    STATUS_DELEGATED,
    STATUS_OK,
    STATUS_PARTIAL,
    STATUS_UNSUPPORTED,
    LineagePlan,
    Pipeline,
    Resolution,
    TableRef,
)
from .omd import OmdClient, pipeline_lineage_state
from .propagate import build_plan
from .read.repo import RepoReader
from .resolve import Resolver


@dataclass
class GateResult:
    state: str = SUPPORTED
    drivers: list[str] = field(default_factory=list)
    platforms: list[str] = field(default_factory=list)
    issues: list[Any] = field(default_factory=list)


@dataclass
class PipelineOutcome:
    pipeline_uuid: str
    pipeline_name: str
    status: str = STATUS_OK
    gate: GateResult = field(default_factory=GateResult)
    plan: LineagePlan | None = None
    coverage: Coverage | None = None
    emit: EmitResult | None = None
    fingerprint: str | None = None
    issues: list[Any] = field(default_factory=list)
    skipped_reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline": self.pipeline_uuid,
            "name": self.pipeline_name,
            "status": self.status,
            "skipped_reason": self.skipped_reason,
            "fingerprint": self.fingerprint,
            "platforms": self.gate.platforms,
            "drivers": self.gate.drivers,
            "plan": self.plan.to_dict() if self.plan else None,
            "coverage": self.coverage.to_dict() if self.coverage else None,
            "emit": self.emit.to_dict() if self.emit else None,
            "issues": [issue.to_dict() for issue in self.issues],
        }


class _ResolverCatalog:
    """Column catalog backed by OpenMetadata through the resolver."""

    def __init__(self, resolver: Resolver):
        self.resolver = resolver

    def columns(self, table: TableRef) -> list[str] | None:
        return self.resolver.columns(table)


class Engine:
    def __init__(
        self,
        config: Config,
        client: OmdClient | None = None,
        reader: RepoReader | None = None,
        offline: bool = False,
        capabilities: CapabilityMap | None = None,
    ):
        self.config = config
        self.client = client
        self.offline = offline or client is None
        self.reader = reader or RepoReader(config.repo_path)
        self.capabilities = capabilities or CapabilityMap.load()
        self.resolver = Resolver(config, client=client, offline=self.offline)
        self.spool = Spool(self.state_dir)

    # -- paths -----------------------------------------------------------
    @property
    def state_dir(self) -> Path:
        return self.config.repo_path / "mage_data" / self.reader.project_uuid / "omd_lineage"

    @property
    def report_path(self) -> Path:
        return self.config.report_path(self.state_dir / "coverage.json")

    # -- selection -------------------------------------------------------
    def select(self, pipelines: list[str] | None, all_pipelines: bool) -> list[str]:
        if pipelines:
            return pipelines
        if all_pipelines:
            return [pipeline.uuid for pipeline in self.config.enabled_pipelines()]
        raise errors.ConfigError(
            "Name a pipeline with --pipeline, or pass --all for every enabled pipeline"
        )

    # -- gate ------------------------------------------------------------
    def gate(self, pipeline: Pipeline) -> GateResult:
        result = GateResult()
        seen: set[str] = set()
        for block in pipeline.blocks.values():
            driver = block.driver or self._profile_driver(block.profile)
            if not driver or driver in seen:
                continue
            seen.add(driver)
            capability = self.capabilities.lookup(driver)
            result.drivers.append(driver)
            if capability.platform:
                result.platforms.append(capability.platform)
            if capability.state == UNSUPPORTED:
                result.state = UNSUPPORTED
                result.issues.append(
                    errors.Issue(
                        code=errors.UNSUPPORTED_PLATFORM,
                        message=(
                            f"Driver '{driver}' is not supported: "
                            f"{capability.note or 'no OMD service'}"
                        ),
                        pipeline=pipeline.uuid,
                        detail={"driver": driver, "platform": capability.platform},
                    )
                )
            elif capability.state == DELEGATED and result.state == SUPPORTED:
                result.state = DELEGATED
                result.issues.append(
                    errors.Issue(
                        code=errors.DELEGATED_PLATFORM,
                        message=(
                            f"Driver '{driver}' is delegated: "
                            f"{capability.note or 'use another integration'}"
                        ),
                        pipeline=pipeline.uuid,
                        detail={"driver": driver},
                    )
                )
        return result

    def _profile_driver(self, profile_name: str | None) -> str | None:
        try:
            return self.config.profile(profile_name).driver
        except errors.ConfigError:
            return None

    # -- analysis --------------------------------------------------------
    def catalog(self) -> ColumnCatalog:
        if self.client is None or self.offline:
            return NullCatalog()
        return _ResolverCatalog(self.resolver)

    def build(self, pipeline_uuid: str) -> tuple[Pipeline, LineagePlan, str]:
        pipeline = self.reader.load_pipeline(pipeline_uuid)
        plan = build_plan(pipeline, self.config, self.catalog())
        plan.fingerprint = pipeline_fingerprint(pipeline, self.config)
        return pipeline, plan, plan.fingerprint

    # -- run -------------------------------------------------------------
    def run(
        self,
        pipeline_uuid: str,
        apply: bool = False,
        force: bool = False,
        only_missing: bool = False,
    ) -> PipelineOutcome:
        pipeline_config = self.config.pipeline(pipeline_uuid)
        pipeline = self.reader.load_pipeline(pipeline_uuid)
        self.resolver.clear_cache()
        outcome = PipelineOutcome(
            pipeline_uuid=pipeline.uuid,
            pipeline_name=pipeline.name,
        )

        gate = self.gate(pipeline)
        outcome.gate = gate
        if gate.state != SUPPORTED:
            outcome.status = STATUS_UNSUPPORTED if gate.state == UNSUPPORTED else STATUS_DELEGATED
            outcome.skipped_reason = (
                f"Pipeline uses {gate.state} platform(s): {', '.join(gate.drivers)}"
            )
            outcome.issues.extend(gate.issues)
            return outcome

        plan = build_plan(pipeline, self.config, self.catalog())
        plan.fingerprint = pipeline_fingerprint(pipeline, self.config)
        outcome.plan = plan
        outcome.fingerprint = plan.fingerprint
        outcome.issues.extend(plan.issues)

        if not apply:
            outcome.status = plan.status
            return outcome

        if self.client is None:
            raise errors.FatalError("Cannot apply lineage without an OpenMetadata client")

        if only_missing:
            plan = self._filter_to_spooled(plan)

        resolutions = self._resolve(plan)
        coverage = build_coverage(plan, resolutions, gate.platforms)
        outcome.coverage = coverage
        outcome.issues.extend(self.resolver.issues)

        if (
            self.config.openmetadata.coverage.emit == "all_or_nothing"
            and (coverage.missing or coverage.ambiguous)
        ):
            # Nothing is published unless every referenced table resolves.
            outcome.emit = EmitResult(
                status="skipped",
                edges_skipped=len(plan.edges),
                missing_tables=[
                    entry["table"] for entry in coverage.missing + coverage.ambiguous
                ],
            )
            outcome.status = STATUS_PARTIAL
            self._write_coverage(coverage, outcome)
            return outcome

        emitter = Emitter(self.config, self.client, self.spool)
        deadline = time.monotonic() + (self.config.openmetadata.emit.time_budget_ms / 1000)

        existing = None
        expected_fqn = None
        if not force:
            expected_fqn = (
                f"{self.config.openmetadata.pipeline_service}."
                f"{emitter.pipeline_name(pipeline, self.reader.project_uuid)}"
            )
            existing = self.client.get_pipeline(expected_fqn)
            prior = pipeline_lineage_state(existing).get("fingerprint")
            if (
                prior == plan.fingerprint
                and pipeline_config.mode_enabled("on_change")
                and pipeline_config.trigger.emit_on_unchanged == "status_only"
            ):
                emitter.ensure_pipeline(
                    pipeline,
                    self.reader.project_uuid,
                    fingerprint=plan.fingerprint,
                    status="unchanged",
                )
                result = EmitResult(status="ok", unchanged=True)
                result.pipeline_fqn = expected_fqn
                outcome.emit = result
                outcome.status = STATUS_OK
                return outcome

        fqn, pipeline_id = emitter.ensure_pipeline(
            pipeline,
            self.reader.project_uuid,
            fingerprint=plan.fingerprint,
            status=coverage.status,
            gaps=[entry["table"] for entry in coverage.missing],
        )
        emit_result = emitter.emit(plan, pipeline, resolutions, pipeline_id, deadline=deadline)
        emit_result.pipeline_fqn = fqn
        outcome.emit = emit_result

        if coverage.status == STATUS_PARTIAL or emit_result.status == "partial":
            outcome.status = STATUS_PARTIAL
        elif emit_result.status == "failed":
            outcome.status = "failed"
        else:
            outcome.status = STATUS_OK

        self._write_coverage(coverage, outcome)
        return outcome

    # -- internals -------------------------------------------------------
    def _resolve(self, plan: LineagePlan) -> dict[str, Resolution]:
        resolutions: dict[str, Resolution] = {}
        for table in plan.referenced_tables():
            resolutions[str(table)] = self.resolver.resolve(table)
        return resolutions

    def _filter_to_spooled(self, plan: LineagePlan) -> LineagePlan:
        records = self.spool.read_all()
        if not records:
            return plan
        wanted = {(record.get("from_table"), record.get("to_table")) for record in records}
        plan.edges = [
            edge for edge in plan.edges if (str(edge.from_table), str(edge.to_table)) in wanted
        ]
        return plan

    def _write_coverage(self, coverage: Coverage, outcome: PipelineOutcome) -> None:
        path = self.report_path
        path.parent.mkdir(parents=True, exist_ok=True)
        import json

        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "connector_version": __version__,
            "pipeline": coverage.to_dict(),
            "emit": outcome.emit.to_dict() if outcome.emit else None,
        }
        path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def build_client(config: Config) -> OmdClient:
    return OmdClient(
        host=config.openmetadata.host or "",
        token=config.openmetadata.token or "",
        auth=config.openmetadata.auth,
        verify_tls=config.openmetadata.verify_tls,
        timeout=config.openmetadata.timeout_seconds,
    )
