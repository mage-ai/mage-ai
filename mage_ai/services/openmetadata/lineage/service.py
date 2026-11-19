"""Fail-open runtime integration for publishing pipeline lineage to OpenMetadata.

The integration is opt-in twice:

* ``ENABLE_OPENMETADATA`` turns the service on for the Mage process.
* A pipeline is opted in by setting ``enabled: true`` under ``pipelines.<uuid>`` in
  the project's ``omd_lineage.yaml``.

Mage calls :func:`emit_pipeline_lineage` after a pipeline run succeeds. Nothing in
this module may raise into the run: a catalog or network problem is logged and the
pipeline stays successful.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import TYPE_CHECKING

from mage_ai.settings import ENABLE_OPENMETADATA, OPENMETADATA_CONFIG_PATH

if TYPE_CHECKING:
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.orchestration.db.models.schedules import PipelineRun

logger = logging.getLogger(__name__)

CONFIG_FILE = 'omd_lineage.yaml'


def initialize_openmetadata() -> bool:
    """Return whether OpenMetadata lineage publishing is enabled."""
    if not ENABLE_OPENMETADATA:
        return False
    logger.info('OpenMetadata lineage publishing is enabled.')
    return True


def emit_pipeline_lineage(
    pipeline: 'Pipeline',
    pipeline_run: 'PipelineRun' | None = None,
) -> None:
    """Publish lineage for a pipeline that has just completed successfully.

    This function never raises. It is intentionally called only from success paths.
    """
    try:
        _emit(pipeline, pipeline_run)
    except Exception as error:  # noqa: BLE001 - lineage must never fail a pipeline
        logger.warning(
            'OpenMetadata lineage emission skipped for pipeline %s: %s',
            getattr(pipeline, 'uuid', None),
            error,
        )


def _emit(pipeline: 'Pipeline', pipeline_run: 'PipelineRun' | None) -> None:
    if not ENABLE_OPENMETADATA:
        return

    pipeline_uuid = str(pipeline.uuid)
    config_path = _config_path(pipeline)
    if not config_path.exists():
        logger.info(
            'OpenMetadata lineage: no %s in %s; skipping pipeline %s.',
            CONFIG_FILE,
            pipeline.repo_path,
            pipeline_uuid,
        )
        return

    from mage_ai.services.openmetadata.lineage.config import Config
    from mage_ai.services.openmetadata.lineage.engine import Engine, build_client

    config = Config.load(config_path)
    # The project path is authoritative even when the config file lives elsewhere.
    config.mage.repo_path = str(pipeline.repo_path)

    pipeline_config = config.pipeline(pipeline_uuid)
    if not pipeline_config.enabled:
        logger.info(
            'OpenMetadata lineage: pipeline %s is not enabled; skipping.',
            pipeline_uuid,
        )
        return

    if not (
        pipeline_config.mode_enabled('on_run')
        or pipeline_config.mode_enabled('on_change')
    ):
        logger.info(
            'OpenMetadata lineage: pipeline %s trigger modes %s exclude run-time '
            'emission; skipping.',
            pipeline_uuid,
            pipeline_config.trigger.modes,
        )
        return

    outcome = Engine(config, client=build_client(config)).run(pipeline_uuid, apply=True)
    logger.info(
        'OpenMetadata lineage: pipeline=%s status=%s edges=%s spooled=%s run=%s',
        outcome.pipeline_uuid,
        outcome.status,
        outcome.emit.edges_written if outcome.emit else 0,
        outcome.emit.spooled if outcome.emit else 0,
        getattr(pipeline_run, 'id', None),
    )


def _config_path(pipeline: 'Pipeline') -> Path:
    if OPENMETADATA_CONFIG_PATH:
        path = Path(os.path.expanduser(OPENMETADATA_CONFIG_PATH))
        return path if path.is_absolute() else Path(pipeline.repo_path) / path
    return Path(pipeline.repo_path) / CONFIG_FILE
