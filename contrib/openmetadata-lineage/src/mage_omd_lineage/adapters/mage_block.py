"""Mage runtime adapter: a fail-open emitter for a sentinel block or callback.

Mage imports this module from the project's ``requirements.txt``. Nothing here may
raise into the pipeline: a lineage failure must never mark a successful run as failed.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

CONFIG_ENV = "OMD_LINEAGE_CONFIG"


def lineage_emit(**kwargs: Any) -> None:
    """Entry point for a Mage custom block or callback block.

    Returns ``None`` always. Configure with ``omd_lineage.yaml`` at the project root,
    or point ``OMD_LINEAGE_CONFIG`` at it.
    """
    try:
        _emit(kwargs)
    except Exception as exc:  # noqa: BLE001 - never fail the pipeline
        logger.warning("mage-omd-lineage: lineage emission skipped: %s", exc)
    return None


def _emit(kwargs: dict[str, Any]) -> None:
    from ..config import Config
    from ..engine import Engine, build_client

    pipeline_uuid = kwargs.get("pipeline_uuid")
    if not pipeline_uuid:
        raise RuntimeError("pipeline_uuid missing from Mage block context")

    repo_path = Path(kwargs.get("repo_path") or os.environ.get("MAGE_REPO_PATH") or ".")
    config_path = os.environ.get(CONFIG_ENV) or (repo_path / "omd_lineage.yaml")
    if not Path(config_path).exists():
        raise RuntimeError(f"config not found: {config_path}")

    config = Config.load(config_path)
    pipeline_config = config.pipeline(str(pipeline_uuid))
    if not pipeline_config.enabled:
        logger.info(
            "mage-omd-lineage: pipeline=%s is not enabled; skipping", pipeline_uuid
        )
        return
    if not (
        pipeline_config.mode_enabled("on_run")
        or pipeline_config.mode_enabled("on_change")
    ):
        logger.info(
            "mage-omd-lineage: pipeline=%s trigger modes %s exclude run-time emission",
            pipeline_uuid,
            pipeline_config.trigger.modes,
        )
        return
    engine = Engine(config, client=build_client(config))
    outcome = engine.run(str(pipeline_uuid), apply=True)
    logger.info(
        "mage-omd-lineage: pipeline=%s status=%s emitted=%s spooled=%s",
        outcome.pipeline_uuid,
        outcome.status,
        outcome.emit.edges_written if outcome.emit else 0,
        outcome.emit.spooled if outcome.emit else 0,
    )
