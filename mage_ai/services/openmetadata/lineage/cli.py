"""Command line interface.

Exit codes:
  0  everything resolved and published
  1  partial: resolvable edges published, gaps reported
  2  fatal: configuration, auth or transport failure
  3  unsupported platform (lineage cannot exist for that database)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from . import __version__, errors
from .capabilities import CapabilityMap
from .config import Config
from .engine import Engine, build_client
from .fingerprint import pipeline_fingerprint
from .ir import STATUS_DELEGATED, STATUS_PARTIAL, STATUS_UNSUPPORTED
from .omd import OmdError, pipeline_lineage_state

DURATION_PATTERN = re.compile(r"^(\d+)\s*([smhd])$")
DURATION_UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "platforms":
            return _cmd_platforms(args)
        config = _load_config(args)
        engine = _build_engine(config, args)
        if args.command == "plan":
            return _cmd_plan(engine, config, args)
        if args.command == "coverage":
            return _cmd_coverage(engine, config, args)
        if args.command == "apply":
            return _cmd_apply(engine, config, args)
        if args.command == "fingerprint":
            return _cmd_fingerprint(engine, config, args)
        if args.command == "spool":
            return _cmd_spool(engine, config, args)
    except (errors.ConfigError, OmdError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    parser.print_help()
    return 2


# ---------------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------------


def _cmd_platforms(args: argparse.Namespace) -> int:
    capability_map = CapabilityMap.load()
    rows = capability_map.as_rows()
    if args.format == "json":
        print(json.dumps(rows, indent=2))
        return 0
    print(f"{'DRIVER':<22} {'OMD SERVICE':<16} {'STATE':<12} NOTE")
    for row in rows:
        print(
            f"{row['driver']:<22} {str(row['platform'] or '-'):<16} "
            f"{row['state']:<12} {row['note'] or ''}"
        )
    return 0


def _cmd_plan(engine: Engine, config: Config, args: argparse.Namespace) -> int:
    uuids = _selected(engine, args)
    outcomes = [engine.run(uuid, apply=False) for uuid in uuids]
    _print_outcomes(outcomes, config, args.format, detailed=True)
    return _exit_code(outcomes, config)


def _cmd_coverage(engine: Engine, config: Config, args: argparse.Namespace) -> int:
    uuids = _selected(engine, args)
    outcomes = []
    for uuid in uuids:
        outcome = engine.run(uuid, apply=False)
        if outcome.plan is not None and not engine.offline:
            resolutions = engine._resolve(outcome.plan)
            from .coverage import build_coverage

            outcome.coverage = build_coverage(outcome.plan, resolutions, outcome.gate.platforms)
        outcomes.append(outcome)
    _print_outcomes(outcomes, config, args.format, detailed=True)
    return _exit_code(outcomes, config)


def _cmd_apply(engine: Engine, config: Config, args: argparse.Namespace) -> int:
    uuids = _selected(engine, args)
    if args.due:
        uuids = _due_pipelines(engine, config, uuids)
    if not uuids:
        print("nothing due")
        return 0
    if not args.non_interactive and not args.yes:
        print("Refusing to write lineage without confirmation. Re-run with --yes.")
        return 2

    outcomes = [engine.run(uuid, apply=True, force=args.force, only_missing=args.only_missing)
                for uuid in uuids]
    _print_outcomes(outcomes, config, args.format, detailed=True)
    return _exit_code(outcomes, config)


def _cmd_fingerprint(engine: Engine, config: Config, args: argparse.Namespace) -> int:
    uuids = _selected(engine, args)
    payload = {}
    for uuid in uuids:
        pipeline = engine.reader.load_pipeline(uuid)
        payload[uuid] = pipeline_fingerprint(pipeline, config)
    print(json.dumps(payload, indent=2))
    return 0


def _cmd_spool(engine: Engine, config: Config, args: argparse.Namespace) -> int:
    if args.spool_command == "show":
        records = engine.spool.read_all()
        print(json.dumps(records, indent=2))
        return 0
    if args.spool_command == "clear":
        engine.spool.clear()
        print("spool cleared")
        return 0
    if args.spool_command == "flush":
        return _cmd_apply(
            engine,
            config,
            argparse.Namespace(
                pipeline=args.pipeline,
                all=args.all,
                format=args.format,
                due=False,
                force=True,
                only_missing=True,
                yes=True,
                non_interactive=True,
            ),
        )
    return 2


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m mage_ai.services.openmetadata.lineage",
        description="Publish Mage pipeline table and column lineage into OpenMetadata",
    )
    parser.add_argument("--version", action="version", version=__version__)

    subparsers = parser.add_subparsers(dest="command", required=True)

    def common(sub: argparse.ArgumentParser, offline: bool = True) -> None:
        sub.add_argument(
            "--project", help="Mage project path (defaults to --config's directory)"
        )
        sub.add_argument("--config", help="Path to omd_lineage.yaml")
        sub.add_argument(
            "--pipeline", action="append", default=[], help="Pipeline uuid (repeatable)"
        )
        sub.add_argument("--all", action="store_true", help="Every enabled pipeline")
        sub.add_argument("--format", choices=["table", "json"], default="table")
        if offline:
            sub.add_argument(
                "--offline",
                action="store_true",
                help="Do not call OpenMetadata (plan/fingerprint only)",
            )

    plan = subparsers.add_parser("plan", help="Preview lineage without writing")
    common(plan)

    coverage = subparsers.add_parser("coverage", help="Resolve and report coverage without writing")
    common(coverage)

    apply_parser = subparsers.add_parser("apply", help="Resolve and write lineage")
    common(apply_parser)
    apply_parser.add_argument("--force", action="store_true", help="Ignore fingerprint/schedule")
    apply_parser.add_argument(
        "--only-missing", action="store_true", help="Only retry edges recorded in the spool"
    )
    apply_parser.add_argument(
        "--due", action="store_true", help="Only pipelines whose refresh is due"
    )
    apply_parser.add_argument("--yes", action="store_true", help="Confirm writes")
    apply_parser.add_argument("--non-interactive", action="store_true")

    fingerprint = subparsers.add_parser("fingerprint", help="Print pipeline fingerprints")
    common(fingerprint)

    platforms = subparsers.add_parser("platforms", help="Show the Mage -> OMD capability map")
    platforms.add_argument("--format", choices=["table", "json"], default="table")

    spool = subparsers.add_parser("spool", help="Inspect or flush the unresolved-edge spool")
    spool.add_argument("spool_command", choices=["show", "clear", "flush"])
    spool.add_argument("--project", help="Mage project path")
    spool.add_argument("--config", help="Path to omd_lineage.yaml")
    spool.add_argument("--pipeline", action="append", default=[])
    spool.add_argument("--all", action="store_true")
    spool.add_argument("--format", choices=["table", "json"], default="table")

    return parser


def _load_config(args: argparse.Namespace) -> Config:
    if args.config:
        return Config.load(args.config)
    if args.project:
        candidate = Path(args.project).expanduser() / "omd_lineage.yaml"
        if candidate.exists():
            return Config.load(candidate)
        raise errors.ConfigError(
            f"No omd_lineage.yaml in {args.project}; pass --config or add the file at the "
            "project root"
        )
    candidate = Path.cwd() / "omd_lineage.yaml"
    if candidate.exists():
        return Config.load(candidate)
    raise errors.ConfigError(
        "No config found. Pass --config /path/to/omd_lineage.yaml "
        "or --project /path/to/mage/project"
    )


def _build_engine(config: Config, args: argparse.Namespace) -> Engine:
    offline = bool(getattr(args, "offline", False))
    client = None
    if not offline:
        client = build_client(config)
    return Engine(config=config, client=client, offline=offline)


def _selected(engine: Engine, args: argparse.Namespace) -> list[str]:
    return engine.select(list(args.pipeline or []), bool(args.all))


def _due_pipelines(engine: Engine, config: Config, uuids: list[str]) -> list[str]:
    due = []
    now = __import__("time").time()
    for uuid in uuids:
        pipeline_config = config.pipeline(uuid)
        if engine.client is None:
            due.append(uuid)
            continue
        pipeline = engine.reader.load_pipeline(uuid)
        fingerprint = pipeline_fingerprint(pipeline, config)
        fqn = None
        try:
            from .emit.emitter import Emitter

            emitter = Emitter(config, engine.client, engine.spool)
            name = emitter.pipeline_name(pipeline, engine.reader.project_uuid)
            fqn = f"{config.openmetadata.pipeline_service}.{name}"
            existing = engine.client.get_pipeline(fqn)
        except OmdError:
            existing = None
        prior = pipeline_lineage_state(existing)

        is_due = False
        if pipeline_config.mode_enabled("schedule") and pipeline_config.trigger.schedule.every:
            last = _parse_timestamp(prior.get("last_attempt_at"))
            interval = _duration_seconds(pipeline_config.trigger.schedule.every)
            if last is None or (now - last) >= interval:
                is_due = True
        if not is_due and pipeline_config.mode_enabled("on_change"):
            if prior.get("fingerprint") != fingerprint:
                is_due = True
        if is_due:
            due.append(uuid)
    return due


def _parse_timestamp(value: str | None) -> float | None:
    if not value:
        return None
    from datetime import datetime

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _duration_seconds(value: str) -> int:
    match = DURATION_PATTERN.match(value.strip().lower())
    if not match:
        raise errors.ConfigError(f"Invalid duration '{value}'; use e.g. 30m, 6h, 7d")
    return int(match.group(1)) * DURATION_UNITS[match.group(2)]


def _print_outcomes(
    outcomes: list[Any],
    config: Config,
    output_format: str,
    detailed: bool = False,
) -> None:
    if output_format == "json":
        print(json.dumps([outcome.to_dict() for outcome in outcomes], indent=2, default=str))
        return

    for outcome in outcomes:
        line = f"{outcome.pipeline_uuid}: {outcome.status}"
        if outcome.skipped_reason:
            line += f" ({outcome.skipped_reason})"
        print(line)
        if outcome.plan is not None:
            for edge in outcome.plan.edges:
                columns = len(edge.columns)
                print(
                    f"  {edge.from_table} -> {edge.to_table}"
                    f"  [{columns} column(s), {edge.confidence}]"
                )
        if detailed and outcome.coverage is not None:
            coverage = outcome.coverage
            print(
                f"  coverage: tables {coverage.wired}/{coverage.referenced}, "
                f"columns {coverage.column_coverage:.0%}"
            )
            for entry in coverage.missing:
                print(f"  missing: {entry['table']} - {entry['message']}")
            for entry in coverage.ambiguous:
                print(f"  ambiguous: {entry['table']} - {entry['message']}")
            for block in coverage.unmodelled_blocks:
                print(f"  unmodelled block: {block}")
        if outcome.emit is not None:
            emit = outcome.emit
            print(
                f"  emitted: {emit.edges_written} edge(s), {emit.columns_written} column(s), "
                f"{emit.spooled} spooled"
            )
        for issue in outcome.issues:
            if issue.code in {
                errors.UNSUPPORTED_PLATFORM,
                errors.DELEGATED_PLATFORM,
                errors.AUTH_ERROR,
                errors.UNREACHABLE,
            }:
                print(f"  {issue.code}: {issue.message}")


def _exit_code(outcomes: list[Any], config: Config) -> int:
    fatal_codes = {errors.AUTH_ERROR, errors.UNREACHABLE}
    for outcome in outcomes:
        issues = list(outcome.issues)
        if outcome.emit is not None:
            issues.extend(outcome.emit.issues)
        for issue in issues:
            if issue.code in fatal_codes:
                return 2
    if any(
        outcome.status == STATUS_UNSUPPORTED
        for outcome in outcomes
    ) and config.openmetadata.coverage.on_unsupported == "fail":
        return 3
    if any(outcome.status in {STATUS_PARTIAL, "failed"} for outcome in outcomes):
        return 1
    if any(outcome.status == STATUS_DELEGATED for outcome in outcomes):
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
