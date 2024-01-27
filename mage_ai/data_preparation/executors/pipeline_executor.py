import asyncio
import traceback
from datetime import datetime
from typing import Dict, List

import pytz

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.constants import EventNameType, EventObjectType
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class PipelineExecutor:
    def __init__(self, pipeline: Pipeline, execution_partition: str = None):
        self.pipeline = pipeline
        self.execution_partition = execution_partition
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        )
        self.logger = DictLogger(self.logger_manager.logger)

    def cancel(self, **kwargs):
        pass

    def execute(
        self,
        allow_blocks_to_fail: bool = False,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        pipeline_run_id: int = None,
        run_sensors: bool = True,
        run_tests: bool = True,
        update_status: bool = False,
        **kwargs,
    ) -> None:
        """
        Executes the pipeline, handling block runs and logging.

        Args:
            allow_blocks_to_fail (bool): Whether to allow blocks to fail during execution.
            analyze_outputs (bool): Whether to analyze block outputs during execution.
            global_vars (Dict): Global variables accessible to block executions.
            pipeline_run_id (int): Identifier of the pipeline run.
            run_sensors (bool): Whether to run sensors during execution.
            run_tests (bool): Whether to run tests during execution.
            update_status (bool): Whether to update the execution status.
            **kwargs: Additional keyword arguments.
        """
        if pipeline_run_id is None:
            # Execute the pipeline without block runs
            asyncio.run(self.pipeline.execute(
                analyze_outputs=analyze_outputs,
                global_vars=global_vars,
                run_sensors=run_sensors,
                run_tests=run_tests,
                update_status=update_status,
            ))
        else:
            # Supported pipeline types: Standard batch pipeline
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            if pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
                return
            asyncio.run(self.__run_blocks(
                pipeline_run,
                allow_blocks_to_fail=allow_blocks_to_fail,
                global_vars=global_vars,
            ))

        self.logger_manager.output_logs_to_destination()

    async def __run_blocks(
        self,
        pipeline_run: PipelineRun,
        allow_blocks_to_fail: bool = False,
        global_vars: Dict = None
    ):
        """
        Runs blocks asynchronously within a pipeline run.

        Args:
            pipeline_run (PipelineRun): The current pipeline run.
            allow_blocks_to_fail (bool): Whether to allow blocks to fail during execution.
            global_vars (Dict): Global variables accessible to block executions.
        """
        if global_vars is None:
            global_vars = dict()

        def create_block_task(
            block_run: BlockRun,
            block_run_outputs_cache: Dict[str, List],
        ) -> asyncio.Task:
            async def execute_block() -> None:
                executor_kwargs = dict(
                    pipeline=self.pipeline,
                    block_uuid=block_run.block_uuid,
                    execution_partition=self.execution_partition,
                )
                block_run_data = dict(status=BlockRun.BlockRunStatus.RUNNING)
                if not block_run.started_at or \
                        (block_run.metrics and not block_run.metrics.get('controller')):
                    block_run_data['started_at'] = datetime.now(tz=pytz.UTC)

                block_run.update(**block_run_data)

                try:
                    return BlockExecutor(block_run_id=block_run.id, **executor_kwargs).execute(
                        block_run_id=block_run.id,
                        block_run_outputs_cache=block_run_outputs_cache,
                        cache_block_output_in_memory=self.pipeline.cache_block_output_in_memory,
                        global_vars=global_vars,
                        pipeline_run_id=pipeline_run.id,
                        skip_logging=True,
                    )
                except Exception as error:
                    errors = traceback.format_stack()

                    await UsageStatisticLogger().error(
                        event_name=EventNameType.BLOCK_RUN_ERROR,
                        errors='\n'.join(errors or []),
                        message=str(error),
                        resource=EventObjectType.BLOCK_RUN,
                        resource_id=block_run.block_uuid,
                        resource_parent=EventObjectType.PIPELINE if self.pipeline else None,
                        resource_parent_id=self.pipeline.uuid if self.pipeline else None,
                    )

                    raise error

            return asyncio.create_task(execute_block())

        block_run_outputs_cache = dict()

        while not pipeline_run.all_blocks_completed(allow_blocks_to_fail):
            # Update the statuses of the block runs to CONDITION_FAILED or UPSTREAM_FAILED.
            pipeline_run.update_block_run_statuses(pipeline_run.initial_block_runs)
            executable_block_runs = pipeline_run.executable_block_runs(
                allow_blocks_to_fail=allow_blocks_to_fail,
            )
            if not executable_block_runs:
                return
            block_run_tasks = [
                create_block_task(b, block_run_outputs_cache=block_run_outputs_cache)
                for b in executable_block_runs]
            block_run_outputs = await asyncio.gather(*block_run_tasks)
            if self.pipeline.cache_block_output_in_memory:
                for idx, block_run in enumerate(executable_block_runs):
                    block_run_outputs_cache[block_run.block_uuid] = \
                        block_run_outputs[idx].get('output', [])

    def build_tags(self, **kwargs):
        default_tags = dict(
            pipeline_uuid=self.pipeline.uuid,
        )
        if kwargs.get('pipeline_run_id'):
            default_tags['pipeline_run_id'] = kwargs.get('pipeline_run_id')
        return merge_dict(kwargs.get('tags', {}), default_tags)

    def _run_commands(
        self,
        global_vars: Dict = None,
        pipeline_run_id: int = None,
        **kwargs,
    ) -> List[str]:
        """
        Run the commands for the pipeline.

        Args:
            global_vars: Global variables for the block execution.
            pipeline_run_id: The ID of the pipeline run.
            **kwargs: Additional keyword arguments.

        Returns:
            A list of command arguments.
        """
        cmd = f'/app/run_app.sh '\
              f'mage run {self.pipeline.repo_config.repo_path} '\
              f'{self.pipeline.uuid}'
        options = [
            '--executor-type',
            'local_python',
        ]
        if self.execution_partition is not None:
            options += [
                '--execution-partition',
                f'{self.execution_partition}',
            ]
        if pipeline_run_id is not None:
            options += [
                '--pipeline-run-id',
                f'{pipeline_run_id}',
            ]
        return cmd.split(' ') + options
