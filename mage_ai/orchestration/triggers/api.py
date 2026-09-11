from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Union

from pytz import UTC

from mage_ai.api.resources.PipelineScheduleResource import PipelineScheduleResource
from mage_ai.data_preparation.models.block.remote.models import RemoteBlock
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.data_preparation.models.utils import warn_for_repo_path
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.triggers.constants import (
    DEFAULT_POLL_INTERVAL,
    TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE,
)
from mage_ai.orchestration.triggers.utils import (
    check_pipeline_run_status,
    create_and_start_pipeline_run,
)
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path

if TYPE_CHECKING:
    from mage_ai.data_preparation.models.pipelines.integration_pipeline import (
        IntegrationPipeline,
    )


def trigger_pipeline(
    pipeline_uuid: str,
    repo_path: str | None = None,
    variables: dict | None = None,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: float | None = None,
    schedule_name: str | None = None,
    remote_blocks: list[Union[dict, RemoteBlock]] | None = None,
    *,
    check_status: bool = False,
    error_on_failure: bool = False,
    verbose: bool = True,
    return_remote_blocks: bool = False,
    _should_schedule: bool = False,  # For internal use only (e.g. running hooks from notebook).
) -> PipelineRun:
    """Triggers a pipeline run and optionally monitors its execution status.

    This function creates a pipeline schedule if one doesn't exist, starts a pipeline run,
    and optionally polls for the run's completion status. It's the main entry point for
    programmatically executing Mage pipelines.

    Parameters
    ----------
    pipeline_uuid : str
        The UUID of the pipeline to trigger.
    repo_path : str, optional
        Path to the repository. If None, uses the default repo path.
    variables : dict, optional
        Dictionary of variables to pass to the pipeline.
    poll_interval : float, optional
        Time in seconds between status checks when check_status is True.
    poll_timeout : float, optional
        Maximum time in seconds to wait for pipeline completion.
    schedule_name : str, optional
        Name for the pipeline schedule. If None, uses a default name.
    remote_blocks : list[Union[dict, RemoteBlock]], optional
        List of remote blocks to include in the pipeline run.
    check_status : bool, optional
        Whether to poll for the pipeline run's completion status.
    error_on_failure : bool, optional
        Whether to raise an exception if the pipeline run fails.
    verbose : bool, optional
        Whether to print status messages during polling.
    return_remote_blocks : bool, optional
        Whether to return remote blocks information instead of the pipeline run.
    _should_schedule : bool, optional
        For internal use only. Whether to schedule the pipeline run.

    Returns
    -------
    PipelineRun or list[dict]
        The created pipeline run object, or a list containing remote blocks
        information if return_remote_blocks is True.

    Raises
    ------
    Exception
        If error_on_failure is True and the pipeline run fails.

    Notes
    -----
    This function is the primary API for programmatically executing Mage pipelines.
    It handles the creation of pipeline schedules, starting pipeline runs, and
    optionally monitoring their execution status.

    See Also
    --------
    mage_ai.orchestration.triggers.utils.create_and_start_pipeline_run
    mage_ai.orchestration.triggers.utils.check_pipeline_run_status
    """
    if variables is None:
        variables = {}

    warn_for_repo_path(repo_path)

    if remote_blocks:
        arr = []
        for remote_block in remote_blocks:
            if isinstance(remote_block, dict):
                remote_block = RemoteBlock.load(**remote_block)
            arr.append(remote_block.to_dict())
        variables['remote_blocks'] = arr

    repo_path_use = repo_path or get_repo_path()
    pipeline = Pipeline.get(
        pipeline_uuid,
        all_projects=project_platform_activated(),
        repo_path=repo_path_use,
        use_repo_path=repo_path is not None,
    )

    pipeline_schedule = __fetch_or_create_pipeline_schedule(pipeline, schedule_name=schedule_name)

    pipeline_run = create_and_start_pipeline_run(
        pipeline,
        pipeline_schedule,
        dict(variables=variables),
        should_schedule=_should_schedule,
    )

    if check_status:
        pipeline_run = check_pipeline_run_status(
            pipeline_run,
            error_on_failure=error_on_failure,
            poll_interval=poll_interval,
            poll_timeout=poll_timeout,
            verbose=verbose,
        )

    if return_remote_blocks and pipeline_run and pipeline_run.pipeline:
        pipeline = pipeline_run.pipeline

        return [
            dict(
                remote_blocks=[
                    RemoteBlock.load(
                        block_uuid=block.uuid,
                        execution_partition=pipeline_run.execution_partition,
                        pipeline_uuid=pipeline.uuid,
                        repo_path=pipeline.repo_path,
                    )
                    for block in pipeline.blocks_by_uuid.values()
                ],
            ),
        ]

    return pipeline_run


def __fetch_or_create_pipeline_schedule(
    pipeline: 'Pipeline | IntegrationPipeline | None',
    schedule_name: str | None = None,
) -> PipelineSchedule:
    if schedule_name is None:
        schedule_name = TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE

    pipeline_uuid = pipeline.uuid if pipeline else None
    schedule_type = ScheduleType.API

    pipeline_schedule = PipelineSchedule.repo_query.filter(
        PipelineSchedule.name == schedule_name,
        PipelineSchedule.pipeline_uuid == pipeline_uuid,
        PipelineSchedule.schedule_type == schedule_type,
    ).first()

    if not pipeline_schedule:
        resource = PipelineScheduleResource.create(
            dict(
                name=schedule_name,
                schedule_type=schedule_type,
                start_time=datetime.now(tz=UTC),
                status=ScheduleStatus.ACTIVE,
            ),
            None,
            parent_model=pipeline,
        )
        pipeline_schedule = resource.model

    return pipeline_schedule
