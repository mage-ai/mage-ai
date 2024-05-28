import asyncio
import json
import traceback
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Union

import pytz
import requests
from dateutil.relativedelta import relativedelta

from mage_ai.data_integrations.utils.scheduler import (
    build_block_run_metadata,
    get_extra_variables,
)
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.data_integration.utils import (
    destination_module_file_path,
    get_selected_streams,
    get_streams_from_catalog,
    get_streams_from_output_directory,
    source_module_file_path,
)
from mage_ai.data_preparation.models.block.dynamic.child import DynamicChildController
from mage_ai.data_preparation.models.block.dynamic.factory import DynamicBlockFactory
from mage_ai.data_preparation.models.block.dynamic.shared import (
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.block.utils import (
    build_dynamic_block_uuid,
    dynamic_block_values_and_metadata,
)
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.triggers import ScheduleInterval, ScheduleType
from mage_ai.data_preparation.shared.retry import RetryConfig
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name
from mage_ai.usage_statistics.constants import EventNameType, EventObjectType
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class BlockExecutor:
    """
    Executor for a block in a pipeline.
    """

    RETRYABLE = True

    def __init__(
        self,
        pipeline,
        block_uuid,
        execution_partition: Optional[str] = None,
        block_run_id: Optional[int] = None,
    ):
        """
        Initialize the BlockExecutor.

        Args:
            pipeline: The pipeline object.
            block_uuid: The UUID of the block.
            execution_partition: The execution partition of the block.
        """
        self.pipeline = pipeline
        self.block_uuid = block_uuid
        self.execution_partition = execution_partition
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            block_uuid=clean_name(self.block_uuid),
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
            repo_path=self.pipeline.repo_path,
        )
        self.logger = DictLogger(self.logger_manager.logger)
        self.project = Project(repo_config=self.pipeline.repo_config)
        self.retry_metadata = dict(attempts=0)

        self.block = self.pipeline.get_block(self.block_uuid, check_template=True)
        self.block_run = None

        # Ensure the original block run is wrapped only, not the clones.
        if self.block is not None and self.block.is_original_block(block_uuid):
            if self.block.is_dynamic_child_streaming:
                self.block = DynamicBlockFactory(
                    self.block,
                    block_run_id=block_run_id,
                    execution_partition=execution_partition,
                    logger=self.logger,
                )
            elif is_dynamic_block_child(self.block):
                self.block = DynamicChildController(
                    self.block,
                    block_run_id=block_run_id,
                )

    def execute(
        self,
        analyze_outputs: bool = False,
        block_run_id: int = None,
        block_run_outputs_cache: Dict[str, List] = None,
        cache_block_output_in_memory: bool = False,
        callback_url: Union[str, None] = None,
        global_vars: Union[Dict, None] = None,
        input_from_output: Union[Dict, None] = None,
        on_complete: Union[Callable[[str], None], None] = None,
        on_failure: Union[Callable[[str, Dict], None], None] = None,
        on_start: Union[Callable[[str], None], None] = None,
        pipeline_run_id: int = None,
        retry_config: Dict = None,
        runtime_arguments: Union[Dict, None] = None,
        template_runtime_configuration: Union[Dict, None] = None,
        update_status: bool = False,
        verify_output: bool = True,
        block_run_dicts: List[str] = None,
        skip_logging: bool = False,
        **kwargs,
    ) -> Dict:
        """
        Execute the block.

        Args:
            analyze_outputs: Whether to analyze the outputs of the block.
            block_run_id: The ID of the block run.
            block_run_outputs_cache: block uuid to block outputs mapping. It's used when
                cache_block_output_in_memory is set to True.
            cache_block_output_in_memory: Whether to cache the block output in memory. By default,
                the block output is persisted on disk.
            callback_url: The URL for the callback.
            global_vars: Global variables for the block execution.
            input_from_output: Input from the output of a previous block.
            on_complete: Callback function called when the block execution is complete.
            on_failure: Callback function called when the block execution fails.
            on_start: Callback function called when the block execution starts.
            pipeline_run_id: The ID of the pipeline run.
            retry_config: Configuration for retrying the block execution.
            runtime_arguments: Runtime arguments for the block execution.
            template_runtime_configuration: Template runtime configuration for the block execution.
            update_status: Whether to update the status of the block in pipeline metadata.yaml file.
            verify_output: Whether to verify the output of the block.
            **kwargs: Additional keyword arguments.

        Returns:
            The result of the block execution.
        """
        if global_vars is None:
            global_vars = {}
        block_run = None

        if (
            Project.is_feature_enabled_in_root_or_active_project(
                FeatureUUID.GLOBAL_HOOKS,
            )
            and not self.block
        ):
            block_run = BlockRun.query.get(block_run_id) if block_run_id else None
            self.block_run = block_run
            if block_run and block_run.metrics and block_run.metrics.get('hook'):
                from mage_ai.data_preparation.models.block.hook.block import HookBlock
                from mage_ai.data_preparation.models.global_hooks.models import Hook

                hook = Hook.load(**(block_run.metrics.get('hook') or {}))
                self.block = HookBlock(
                    hook.uuid,
                    hook.uuid,
                    BlockType.HOOK,
                    hook=hook,
                )
                if block_run.metrics.get('hook_variables'):
                    global_vars = merge_dict(
                        global_vars,
                        block_run.metrics.get('hook_variables') or {},
                    )

        if template_runtime_configuration:
            # Used for data integration pipeline
            self.block.template_runtime_configuration = template_runtime_configuration

        try:
            result = dict()

            tags = self.build_tags(
                block_run_id=block_run_id, pipeline_run_id=pipeline_run_id, **kwargs
            )

            self.logger.logging_tags = tags

            if on_start is not None:
                on_start(self.block_uuid)

            if not block_run:
                block_run = BlockRun.query.get(block_run_id) if block_run_id else None
                self.block_run = block_run
            pipeline_run = PipelineRun.query.get(pipeline_run_id) if pipeline_run_id else None

            # Data integration block
            is_original_block = self.block.uuid == self.block_uuid
            is_data_integration_child = False
            is_data_integration_controller = False
            data_integration_metadata = None
            run_in_parallel = False
            upstream_block_uuids = None

            is_data_integration = self.block.is_data_integration()

            # Runtime arguments for data integration is used for querying data from
            # the source.
            if is_data_integration and pipeline_run:
                if not runtime_arguments:
                    runtime_arguments = {}

                pipeline_schedule = pipeline_run.pipeline_schedule
                schedule_interval = pipeline_schedule.schedule_interval
                if ScheduleType.API == pipeline_schedule.schedule_type:
                    execution_date = datetime.utcnow()
                else:
                    # This will be none if trigger is API type
                    execution_date = pipeline_schedule.current_execution_date()

                end_date = None
                start_date = None
                date_diff = None

                variables = pipeline_run.get_variables(
                    extra_variables=get_extra_variables(self.pipeline),
                )

                if variables:
                    if global_vars:
                        global_vars.update(variables)
                    else:
                        global_vars = variables

                if ScheduleInterval.ONCE == schedule_interval:
                    end_date = variables.get('_end_date')
                    start_date = variables.get('_start_date')
                elif ScheduleInterval.HOURLY == schedule_interval:
                    date_diff = timedelta(hours=1)
                elif ScheduleInterval.DAILY == schedule_interval:
                    date_diff = timedelta(days=1)
                elif ScheduleInterval.WEEKLY == schedule_interval:
                    date_diff = timedelta(weeks=1)
                elif ScheduleInterval.MONTHLY == schedule_interval:
                    date_diff = relativedelta(months=1)

                if date_diff is not None:
                    end_date = (execution_date).isoformat()
                    start_date = (execution_date - date_diff).isoformat()

                runtime_arguments.update(
                    dict(
                        _end_date=end_date,
                        _execution_date=execution_date.isoformat(),
                        _execution_partition=pipeline_run.execution_partition,
                        _start_date=start_date,
                    )
                )

            if block_run and block_run.metrics and is_data_integration:
                data_integration_metadata = block_run.metrics

                run_in_parallel = int(data_integration_metadata.get('run_in_parallel') or 0) == 1

                upstream_block_uuids = data_integration_metadata.get('upstream_block_uuids')
                is_data_integration_child = data_integration_metadata.get('child', False)
                is_data_integration_controller = data_integration_metadata.get('controller', False)

                stream = data_integration_metadata.get('stream')

                # If child and not controller
                if stream and is_data_integration_child and not is_data_integration_controller:
                    if not self.block.template_runtime_configuration:
                        self.block.template_runtime_configuration = {}

                    self.block.template_runtime_configuration['selected_streams'] = [
                        stream,
                    ]
                    for key in [
                        'index',
                        'parent_stream',
                    ]:
                        if key in data_integration_metadata:
                            self.block.template_runtime_configuration[key] = (
                                data_integration_metadata.get(key)
                            )

            if not is_data_integration_controller or is_data_integration_child:
                self.logger.info(f'Start executing block with {self.__class__.__name__}.', **tags)

            dynamic_block_index = None
            dynamic_block_indexes = None
            dynamic_upstream_block_uuids = None
            if block_run and block_run.metrics:
                block_run_data = block_run.metrics or {}
                dynamic_block_index = block_run_data.get('dynamic_block_index', None)
                # This is used when there are 2 or more upstream dynamic blocks or dynamic childs.
                dynamic_block_indexes = block_run_data.get('dynamic_block_indexes', None)
                dynamic_upstream_block_uuids = block_run_data.get(
                    'dynamic_upstream_block_uuids', None
                )

            # 2023/12/12 (tommy dang): this doesn’t seem to be used anymore because the
            # fetching the reduce output from upstream dynamic child blocks is handled in
            # the function reduce_output_from_block.

            # If there are upstream blocks that were dynamically created, and if any of them are
            # configured to reduce their output, we must update the dynamic_upstream_block_uuids to
            # include all the upstream block’s dynamically created blocks by getting the upstream
            # block’s dynamic parent block and collecting that parent’s output.
            if dynamic_upstream_block_uuids:
                dynamic_upstream_block_uuids_reduce = []
                dynamic_upstream_block_uuids_no_reduce = []

                for upstream_block_uuid in dynamic_upstream_block_uuids:
                    upstream_block = self.pipeline.get_block(upstream_block_uuid)

                    if not should_reduce_output(upstream_block):
                        dynamic_upstream_block_uuids_no_reduce.append(upstream_block_uuid)
                        continue

                    parts = upstream_block_uuid.split(':')
                    suffix = None
                    if len(parts) >= 3:
                        # A block can have a UUID such as: some_uuid:0 or some_uuid:0:1
                        suffix = ':'.join(parts[2:])

                    # We currently limit a block to only have 1 direct dynamic parent.
                    # We are looping over the upstream blocks just in case we support having
                    # multiple direct dynamic parents.
                    for block_grandparent in list(
                        filter(
                            lambda x: is_dynamic_block(x),
                            upstream_block.upstream_blocks,
                        )
                    ):
                        block_grandparent_uuid = block_grandparent.uuid

                        if suffix and is_dynamic_block_child(block_grandparent):
                            block_grandparent_uuid = f'{block_grandparent_uuid}:{suffix}'

                        values, block_metadata = dynamic_block_values_and_metadata(
                            block_grandparent,
                            block_uuid=block_grandparent_uuid,
                            execution_partition=self.execution_partition,
                        )

                        for idx, _ in enumerate(values):
                            if idx < len(block_metadata):
                                metadata = block_metadata[idx].copy()
                            else:
                                metadata = {}

                            dynamic_upstream_block_uuids_reduce.append(
                                build_dynamic_block_uuid(
                                    upstream_block.uuid,
                                    metadata,
                                    idx,
                                    upstream_block_uuid=block_grandparent_uuid,
                                )
                            )

                dynamic_upstream_block_uuids = (
                    dynamic_upstream_block_uuids_reduce + dynamic_upstream_block_uuids_no_reduce
                )

            should_run_conditional = True

            if is_dynamic_block_child(self.block):
                if self.block_run and (
                    self.block_run.block_uuid == self.block.uuid
                    or (
                        self.block.replicated_block
                        and self.block_run.block_uuid == self.block.uuid_replicated
                    )
                ):
                    should_run_conditional = False

            if should_run_conditional:
                conditional_result = should_run_conditional and self._execute_conditional(
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    global_vars=global_vars,
                    logging_tags=tags,
                    pipeline_run=pipeline_run,
                )
            else:
                conditional_result = not should_run_conditional

            if not conditional_result:
                self.logger.info(
                    f'Conditional block(s) returned false for {self.block.uuid}. '
                    'This block run and downstream blocks will be set as CONDITION_FAILED.',
                    **merge_dict(
                        tags,
                        dict(
                            block_type=self.block.type,
                            block_uuid=self.block.uuid,
                        ),
                    ),
                )

                if is_data_integration:
                    # Only the controller (main and not child) has a condition.
                    def __update_condition_failed(
                        block_run_id_init: int,
                        block_run_block_uuid_init: str,
                        block_init,
                        block_run_dicts=block_run_dicts,
                        tags=tags,
                    ):
                        self.__update_block_run_status(
                            BlockRun.BlockRunStatus.CONDITION_FAILED,
                            block_run_id=block_run_id_init,
                            tags=tags,
                        )

                        downstream_block_uuids = block_init.downstream_block_uuids

                        for block_run_dict in block_run_dicts:
                            block_run_block_uuid = block_run_dict.get('block_uuid')
                            block_run_id2 = block_run_dict.get('id')

                            if block_run_block_uuid_init == block_run_block_uuid:
                                continue

                            block = self.pipeline.get_block(block_run_block_uuid)

                            # Update all the downstream blocks recursively.
                            if block.uuid in downstream_block_uuids:
                                __update_condition_failed(
                                    block_run_id2,
                                    block_run_block_uuid,
                                    block,
                                )

                            # Update all the block runs that have a matching original block UUID
                            metrics = block_run_dict.get('metrics')
                            original_block_uuid = metrics.get('original_block_uuid')
                            if block_init == original_block_uuid or block_init.uuid == block.uuid:
                                self.__update_block_run_status(
                                    BlockRun.BlockRunStatus.CONDITION_FAILED,
                                    block_run_id=block_run_id2,
                                    tags=tags,
                                )

                    __update_condition_failed(
                        block_run_id,
                        self.block_uuid,
                        self.block,
                    )
                else:
                    self.__update_block_run_status(
                        BlockRun.BlockRunStatus.CONDITION_FAILED,
                        block_run_id=block_run_id,
                        callback_url=callback_url,
                        tags=tags,
                    )

                return dict(output=[])

            should_execute = True
            should_finish = False

            # If the original block is running, it means all the child block runs are complete.
            # Update the primary controller to be complete.
            if data_integration_metadata and is_original_block:
                controller_block_uuid = data_integration_metadata.get('controller_block_uuid')
                if on_complete and controller_block_uuid:
                    on_complete(controller_block_uuid)
                    self.logger.info(
                        'All child block runs completed, updating controller block run '
                        f'for block {controller_block_uuid} to complete.',
                        **merge_dict(
                            tags,
                            dict(
                                block_uuid=self.block.uuid,
                                controller_block_uuid=controller_block_uuid,
                            ),
                        ),
                    )
                should_execute = False
            elif (
                is_data_integration_controller
                and is_data_integration_child
                and not run_in_parallel
            ):
                children = []
                status_count = {}
                block_run_dicts_mapping = {}

                for block_run_dict in block_run_dicts:
                    block_run_dicts_mapping[block_run_dict['block_uuid']] = block_run_dict

                    metrics = block_run_dict.get('metrics') or {}
                    controller_block_uuid = metrics.get(
                        'controller_block_uuid',
                    )

                    if controller_block_uuid == self.block_uuid:
                        children.append(block_run_dict)

                    status = block_run_dict.get('status')
                    if status not in status_count:
                        status_count[status] = 0

                    status_count[status] += 1

                # Only update the child controller (for a specific stream) to complete
                # if all its child block runs are complete (only for source).
                children_length = len(children)
                should_finish = (
                    children_length >= 1
                    and status_count.get(
                        BlockRun.BlockRunStatus.COMPLETED.value,
                        0,
                    )
                    >= children_length
                )

                if upstream_block_uuids:
                    statuses_completed = []
                    for up_block_uuid in upstream_block_uuids:
                        block_run_dict = block_run_dicts_mapping.get(up_block_uuid)
                        if block_run_dict:
                            statuses_completed.append(
                                BlockRun.BlockRunStatus.COMPLETED.value
                                == block_run_dict.get(
                                    'status',
                                ),
                            )
                        else:
                            statuses_completed.append(False)

                    should_execute = all(statuses_completed)
                else:
                    should_execute = True
            elif is_data_integration_child and not is_data_integration_controller:
                index = int(data_integration_metadata.get('index') or 0)
                if index >= 1:
                    controller_block_uuid = data_integration_metadata.get('controller_block_uuid')
                    block_run_dict_previous = None

                    for block_run_dict in block_run_dicts:
                        if block_run_dict_previous:
                            break

                        metrics = block_run_dict.get('metrics')

                        if not metrics:
                            continue

                        # Same controller
                        if controller_block_uuid == metrics.get(
                            'controller_block_uuid'
                        ) and index - 1 == int(metrics.get('index') or 0):
                            block_run_dict_previous = block_run_dict

                    if block_run_dict_previous:
                        should_execute = (
                            BlockRun.BlockRunStatus.COMPLETED.value
                            == block_run_dict_previous.get('status')
                        )

                        if not should_execute:
                            stream = data_integration_metadata.get('stream')
                            self.logger.info(
                                f'Block run ({block_run_id}) {self.block_uuid} for stream {stream} '
                                f'and batch {index} is waiting for batch {index - 1} to complete.',
                                **merge_dict(
                                    tags,
                                    dict(
                                        batch=index - 1,
                                        block_uuid=self.block.uuid,
                                        controller_block_uuid=controller_block_uuid,
                                        index=index,
                                    ),
                                ),
                            )

                            return
                else:
                    should_execute = True

            if should_execute:
                try:
                    from mage_ai.shared.retry import retry

                    if retry_config is None:
                        if self.RETRYABLE:
                            retry_config = merge_dict(
                                self.pipeline.repo_config.retry_config or dict(),
                                self.block.retry_config or dict(),
                            )
                        else:
                            retry_config = dict()
                    if type(retry_config) is not RetryConfig:
                        retry_config = RetryConfig.load(config=retry_config)

                    @retry(
                        retries=retry_config.retries if self.RETRYABLE else 0,
                        delay=retry_config.delay,
                        max_delay=retry_config.max_delay,
                        exponential_backoff=retry_config.exponential_backoff,
                        logger=self.logger,
                        logging_tags=tags,
                        retry_metadata=self.retry_metadata,
                    )
                    def __execute_with_retry():
                        # Update global_vars dictionary without copying it so that 'context' arg
                        # can be shared across blocks
                        global_vars.update(dict(retry=self.retry_metadata))

                        return self._execute(
                            analyze_outputs=analyze_outputs,
                            block_run_id=block_run_id,
                            block_run_outputs_cache=block_run_outputs_cache,
                            cache_block_output_in_memory=cache_block_output_in_memory,
                            callback_url=callback_url,
                            global_vars=global_vars,
                            update_status=update_status,
                            input_from_output=input_from_output,
                            logging_tags=tags,
                            pipeline_run_id=pipeline_run_id,
                            verify_output=verify_output,
                            runtime_arguments=runtime_arguments,
                            template_runtime_configuration=template_runtime_configuration,
                            dynamic_block_index=dynamic_block_index,
                            dynamic_block_indexes=dynamic_block_indexes,
                            dynamic_block_uuid=None
                            if dynamic_block_index is None
                            else block_run.block_uuid,
                            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                            data_integration_metadata=data_integration_metadata,
                            pipeline_run=pipeline_run,
                            block_run_dicts=block_run_dicts,
                            **kwargs,
                        )

                    result = __execute_with_retry()
                except Exception as error:
                    self.logger.exception(
                        f'Failed to execute block {self.block.uuid}',
                        **merge_dict(
                            tags,
                            dict(
                                error=error,
                            ),
                        ),
                    )

                    errors = traceback.format_stack()
                    error_details = dict(
                        error=error,
                        errors=errors,
                        message=traceback.format_exc(),
                    )

                    if not skip_logging:
                        asyncio.run(
                            UsageStatisticLogger().error(
                                event_name=EventNameType.BLOCK_RUN_ERROR,
                                errors='\n'.join(errors or []),
                                message=str(error),
                                resource=EventObjectType.BLOCK_RUN,
                                resource_id=self.block_uuid,
                                resource_parent=EventObjectType.PIPELINE
                                if self.pipeline
                                else None,
                                resource_parent_id=self.pipeline.uuid if self.pipeline else None,
                            )
                        )

                    if on_failure is not None:
                        on_failure(
                            self.block_uuid,
                            error=error_details,
                        )
                    else:
                        self.__update_block_run_status(
                            BlockRun.BlockRunStatus.FAILED,
                            block_run_id=block_run_id,
                            callback_url=callback_url,
                            error_details=dict(
                                error=error,
                            ),
                            tags=tags,
                        )
                    self._execute_callback(
                        'on_failure',
                        block_run_id=block_run_id,
                        callback_kwargs=dict(__error=error, retry=self.retry_metadata),
                        dynamic_block_index=dynamic_block_index,
                        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                        global_vars=global_vars,
                        logging_tags=tags,
                        pipeline_run=pipeline_run,
                    )
                    raise error

            if not should_finish:
                should_finish = not is_data_integration_controller or (
                    is_data_integration_child and run_in_parallel
                )

            # Destination must complete immediately or else it’ll keep trying to
            # convert its upstream blocks’ (that aren’t sources) data to Singer Spec output.
            # The child block run for a stream may already be ingesting the data.
            # If this child controller continues to convert the data while the child block run
            # is ingesting the data, there will be a mismatch of records.
            if not should_finish:
                should_finish = (
                    is_data_integration_controller
                    and is_data_integration_child
                    and self.block.is_destination()
                )

            if isinstance(self.block, DynamicBlockFactory):
                should_finish = self.block.is_complete()

            if should_finish:
                self.logger.info(f'Finish executing block with {self.__class__.__name__}.', **tags)

                # This is passed in from the pipeline scheduler
                if on_complete is not None:
                    on_complete(self.block_uuid)
                else:
                    # If this block run is the data integration controller,
                    # don’t update the block run status here.
                    # Wait until all the spawned children are done running.
                    # Then, update the controller block run status elsewhere.
                    self.__update_block_run_status(
                        BlockRun.BlockRunStatus.COMPLETED,
                        block_run_id=block_run_id,
                        callback_url=callback_url,
                        pipeline_run=pipeline_run,
                        tags=tags,
                    )

            # If this block run is the data integration controller block, don’t execute the
            # success callback because this isn’t the last data integration block that needs
            # to run.
            if not data_integration_metadata or is_original_block:
                self._execute_callback(
                    'on_success',
                    block_run_id=block_run_id,
                    callback_kwargs=dict(retry=self.retry_metadata),
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    global_vars=global_vars,
                    logging_tags=tags,
                    pipeline_run=pipeline_run,
                )

            from mage_ai.settings.server import VARIABLE_DATA_OUTPUT_META_CACHE

            if VARIABLE_DATA_OUTPUT_META_CACHE:
                self.block.aggregate_summary_info(execution_partition=self.execution_partition)

            return result
        finally:
            # The code below causes error when running blocks in pipeline_executor
            # if not self.block_run and block_run_id:
            #     self.block_run = BlockRun.query.get(block_run_id)
            # if self.block_run:
            #     asyncio.run(UsageStatisticLogger().block_run_ended(self.block_run))
            self.logger_manager.output_logs_to_destination()

    def _execute(
        self,
        analyze_outputs: bool = False,
        block_run_id: int = None,
        block_run_outputs_cache: Dict[str, List] = None,
        cache_block_output_in_memory: bool = False,
        callback_url: Union[str, None] = None,
        global_vars: Union[Dict, None] = None,
        update_status: bool = False,
        input_from_output: Union[Dict, None] = None,
        logging_tags: Dict = None,
        verify_output: bool = True,
        runtime_arguments: Union[Dict, None] = None,
        dynamic_block_index: Union[int, None] = None,
        dynamic_block_indexes: Dict = None,
        dynamic_block_uuid: Union[str, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        data_integration_metadata: Dict = None,
        pipeline_run: PipelineRun = None,
        block_run_dicts: List[str] = None,
        **kwargs,
    ) -> Dict:
        """
        Execute the block.

        Args:
            analyze_outputs: Whether to analyze the outputs of the block.
            block_run_outputs_cache: block uuid to block outputs mapping. It's used when
                cache_block_output_in_memory is set to True.
            callback_url: The URL for the callback.
            cache_block_output_in_memory: Whether to cache the block output in memory. By default,
                the block output is persisted on disk.
            global_vars: Global variables for the block execution.
            update_status: Whether to update the status of the block execution.
            input_from_output: Input from the output of a previous block.
            logging_tags: Tags for logging.
            verify_output: Whether to verify the output of the block.
            runtime_arguments: Runtime arguments for the block execution.
            dynamic_block_index: Index of the dynamic block.
            dynamic_block_uuid: UUID of the dynamic block.
            dynamic_upstream_block_uuids: List of UUIDs of the dynamic upstream blocks.
            **kwargs: Additional keyword arguments.

        Returns:
            The result of the block execution.
        """
        if logging_tags is None:
            logging_tags = dict()

        extra_options = {}

        if self.block_run and self.block_run.metrics:
            extra_options['metadata'] = self.block_run.metrics.get('metadata')

        if cache_block_output_in_memory:
            store_variables = False
        else:
            store_variables = True
        is_data_integration = False

        if self.project.is_feature_enabled(FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE):
            is_data_integration = self.block.is_data_integration()
            di_settings = None

            blocks = [self.block]
            if self.block.upstream_blocks:
                blocks += self.block.upstream_blocks

            for block in blocks:
                is_current_block_run_block = block.uuid == self.block.uuid

                data_integration_settings = block.get_data_integration_settings(
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=False,
                    global_vars=global_vars,
                    partition=self.execution_partition,
                )

                try:
                    if data_integration_settings:
                        if is_current_block_run_block:
                            di_settings = data_integration_settings

                        # This is required or else loading the module within the block execute
                        # method will create very large log files that compound. Not sure why,
                        # so this is the temp fix.
                        data_integration_uuid = data_integration_settings.get(
                            'data_integration_uuid'
                        )

                        if data_integration_uuid:
                            if 'data_integration_runtime_settings' not in extra_options:
                                extra_options['data_integration_runtime_settings'] = {}

                            if (
                                'module_file_paths'
                                not in extra_options['data_integration_runtime_settings']
                            ):
                                extra_options['data_integration_runtime_settings'][
                                    'module_file_paths'
                                ] = dict(
                                    destinations={},
                                    sources={},
                                )

                            if self.block.is_source():
                                key = 'sources'
                                file_path_func = source_module_file_path
                            else:
                                key = 'destinations'
                                file_path_func = destination_module_file_path

                            if (
                                data_integration_uuid
                                not in extra_options['data_integration_runtime_settings'][
                                    'module_file_paths'
                                ][key]
                            ):
                                extra_options['data_integration_runtime_settings'][
                                    'module_file_paths'
                                ][key][data_integration_uuid] = file_path_func(
                                    data_integration_uuid,
                                )

                            # The source or destination block will return a list of outputs that
                            # contain procs. Procs aren’t JSON serializable so we won’t store those
                            # variables. We’ll only store the variables if this block is ran from
                            # the notebook. The output of the source or destination block is
                            # handled separately than storing variables via the
                            # block.store_variables method.
                            if is_current_block_run_block:
                                store_variables = False
                except Exception as err:
                    print(f'[WARNING] BlockExecutor._execute: {err}')

            is_source = self.block.is_source()
            if is_source and data_integration_metadata:
                execution_partition_previous = data_integration_metadata.get(
                    'execution_partition_previous',
                )
                if execution_partition_previous:
                    extra_options['execution_partition_previous'] = execution_partition_previous

            if (
                di_settings
                and data_integration_metadata
                and data_integration_metadata.get('controller')
                and data_integration_metadata.get('original_block_uuid')
            ):
                original_block_uuid = data_integration_metadata.get('original_block_uuid')

                # This is the source/destination controller block run
                if is_data_integration:
                    arr = []

                    data_integration_uuid = di_settings.get('data_integration_uuid')
                    catalog = di_settings.get('catalog', [])

                    block_run_block_uuids = []
                    if block_run_dicts:
                        block_run_block_uuids += [br.get('block_uuid') for br in block_run_dicts]

                    # Controller for child (single stream with batches).
                    # The child controller is responsible for creating child block runs for a single
                    # stream. The child controller also knows how to fan out and create batches.
                    if data_integration_metadata.get('child'):
                        # Create a block run for the stream for each batch in that stream.
                        stream = data_integration_metadata.get('stream')
                        block_run_metadata = build_block_run_metadata(
                            self.block,
                            self.logger,
                            data_integration_settings=di_settings,
                            dynamic_block_index=dynamic_block_index,
                            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                            global_vars=global_vars,
                            logging_tags=logging_tags,
                            parent_stream=data_integration_metadata.get('parent_stream'),
                            partition=self.execution_partition,
                            pipeline_run=pipeline_run,
                            selected_streams=[stream],
                        )
                        for br_metadata in block_run_metadata:
                            index = br_metadata.get('index') or 0
                            number_of_batches = br_metadata.get('number_of_batches') or 0
                            block_run_block_uuid = (
                                f'{original_block_uuid}:{data_integration_uuid}:{stream}:{index}'
                            )

                            if block_run_block_uuid not in block_run_block_uuids:
                                br = pipeline_run.create_block_run(
                                    block_run_block_uuid,
                                    metrics=merge_dict(
                                        dict(
                                            child=1,
                                            controller_block_uuid=self.block_uuid,
                                            is_last_block_run=index == number_of_batches - 1,
                                            original_block_uuid=original_block_uuid,
                                            stream=stream,
                                        ),
                                        br_metadata,
                                    ),
                                )

                                self.logger.info(
                                    f'Created block run {br.id} for block {br.block_uuid} in batch '
                                    f'index {index} ({index + 1} out of {number_of_batches}).',
                                    **merge_dict(
                                        logging_tags,
                                        dict(
                                            data_integration_uuid=data_integration_uuid,
                                            index=index,
                                            number_of_batches=number_of_batches,
                                            original_block_uuid=original_block_uuid,
                                            stream=stream,
                                        ),
                                    ),
                                )

                                arr.append(br)
                    else:
                        # Controller: main controller and not a child controller.
                        # This controller is responsible for creating all the child controllers,
                        # 1 for each stream.
                        block_run_dicts = []

                        def _build_controller_block_run_dict(
                            stream,
                            block_run_block_uuids=block_run_block_uuids,
                            controller_block_uuid=self.block_uuid,
                            data_integration_uuid=data_integration_uuid,
                            metrics: Dict = None,
                            original_block_uuid=original_block_uuid,
                            run_in_parallel: bool = False,
                        ):
                            block_run_block_uuid = ':'.join([
                                original_block_uuid,
                                data_integration_uuid,
                                stream,
                                'controller',
                            ])

                            if block_run_block_uuid not in block_run_block_uuids:
                                return dict(
                                    block_uuid=block_run_block_uuid,
                                    metrics=merge_dict(
                                        dict(
                                            child=1,
                                            controller=1,
                                            controller_block_uuid=controller_block_uuid,
                                            original_block_uuid=original_block_uuid,
                                            run_in_parallel=1 if run_in_parallel else 0,
                                            stream=stream,
                                        ),
                                        metrics or {},
                                    ),
                                )

                        if is_source:
                            for stream_dict in get_selected_streams(catalog):
                                # Create a child block run for every selected stream.
                                stream = stream_dict.get('tap_stream_id')
                                run_in_parallel = stream_dict.get('run_in_parallel', False)

                                block_dict = _build_controller_block_run_dict(
                                    stream,
                                    run_in_parallel=run_in_parallel,
                                )
                                if block_dict:
                                    block_run_dicts.append(block_dict)
                        else:
                            uuids_to_remove = self.block.inputs_only_uuids

                            up_uuids = self.block.upstream_block_uuids
                            if dynamic_upstream_block_uuids:
                                up_uuids += dynamic_upstream_block_uuids

                                # Remove the original block UUID if there is a dynamic block as
                                # an upstream block.
                                for up_uuid in dynamic_upstream_block_uuids:
                                    up_block = self.pipeline.get_block(up_uuid)
                                    if up_block:
                                        uuids_to_remove.append(up_block.uuid)

                            up_uuids = [i for i in up_uuids if i not in uuids_to_remove]
                            for up_uuid in up_uuids:
                                run_in_parallel = False
                                up_block = self.pipeline.get_block(up_uuid)

                                # If upstream block is a source block with 1 or more streams,
                                # create a child controller for each of those streams and
                                # pass in parent_stream as the block run block UUID
                                if up_block.is_source():
                                    output_file_path_by_stream = get_streams_from_output_directory(
                                        up_block,
                                        execution_partition=self.execution_partition,
                                    )
                                    for stream_id in output_file_path_by_stream.keys():
                                        stream_dict = get_streams_from_catalog(
                                            catalog, [stream_id]
                                        )
                                        if stream_dict:
                                            run_in_parallel = (
                                                stream_dict[0].get(
                                                    'run_in_parallel',
                                                )
                                                or False
                                            )

                                        block_dict = _build_controller_block_run_dict(
                                            stream_id,
                                            metrics=dict(
                                                parent_stream=up_uuid,
                                                run_in_parallel=run_in_parallel,
                                            ),
                                        )
                                        if block_dict:
                                            block_run_dicts.append(block_dict)
                                else:
                                    stream_dict = get_streams_from_catalog(catalog, [up_uuid])
                                    if stream_dict:
                                        run_in_parallel = (
                                            stream_dict[0].get(
                                                'run_in_parallel',
                                            )
                                            or False
                                        )

                                    block_dict = _build_controller_block_run_dict(
                                        up_uuid,
                                        metrics=dict(
                                            run_in_parallel=run_in_parallel,
                                        ),
                                    )
                                    if block_dict:
                                        block_run_dicts.append(block_dict)

                        block_run_dicts_length = len(block_run_dicts)
                        for idx, block_run_dict in enumerate(block_run_dicts):
                            metrics = block_run_dict['metrics']
                            stream = metrics['stream']
                            run_in_parallel = metrics.get('run_in_parallel') or 0

                            if not run_in_parallel or run_in_parallel == 0:
                                if idx >= 1:
                                    block_run_previous = block_run_dicts[idx - 1]
                                    metrics['upstream_block_uuids'] = [
                                        block_run_previous['block_uuid'],
                                    ]

                                if idx < block_run_dicts_length - 1:
                                    block_run_next = block_run_dicts[idx + 1]
                                    metrics['downstream_block_uuids'] = [
                                        block_run_next['block_uuid'],
                                    ]

                            br = pipeline_run.create_block_run(
                                block_run_dict['block_uuid'],
                                metrics=metrics,
                            )

                            self.logger.info(
                                f'Created block run {br.id} for block {br.block_uuid} '
                                f'for stream {stream} {metrics}.',
                                **merge_dict(
                                    logging_tags,
                                    dict(
                                        data_integration_uuid=data_integration_uuid,
                                        original_block_uuid=original_block_uuid,
                                        stream=stream,
                                    ),
                                ),
                            )

                            arr.append(br)

                    return arr

        result = self.block.execute_sync(
            analyze_outputs=analyze_outputs,
            block_run_outputs_cache=block_run_outputs_cache,
            execution_partition=self.execution_partition,
            global_vars=global_vars,
            logger=self.logger,
            logging_tags=logging_tags,
            run_all_blocks=True,
            update_status=update_status,
            input_from_output=input_from_output,
            verify_output=verify_output,
            runtime_arguments=runtime_arguments,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            store_variables=store_variables,
            **extra_options,
        )

        if BlockType.DBT == self.block.type:
            self.block.run_tests(
                block=self.block,
                global_vars=global_vars,
                logger=self.logger,
                logging_tags=logging_tags,
                outputs=result if cache_block_output_in_memory else None,
            )
        elif PipelineType.INTEGRATION != self.pipeline.type and (
            not is_data_integration or BlockLanguage.PYTHON == self.block.language
        ):
            self.block.run_tests(
                execution_partition=self.execution_partition,
                global_vars=global_vars,
                logger=self.logger,
                logging_tags=logging_tags,
                outputs=result if cache_block_output_in_memory else None,
                update_tests=False,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_block_uuid=dynamic_block_uuid,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            )

        return result

    def _execute_conditional(
        self,
        global_vars: Dict,
        logging_tags: Dict,
        pipeline_run: PipelineRun,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
    ) -> bool:
        """
        Execute the conditional blocks.

        Args:
            global_vars: Global variables for the block execution.
            logging_tags: Tags for logging.
            pipeline_run: The pipeline run object.
            dynamic_block_index: Index of the dynamic block.
            dynamic_upstream_block_uuids: List of UUIDs of the dynamic upstream blocks.

        Returns:
            True if all conditional blocks evaluate to True, False otherwise.
        """
        result = True
        for conditional_block in self.block.conditional_blocks:
            try:
                block_result = conditional_block.execute_conditional(
                    self.block,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    execution_partition=self.execution_partition,
                    global_vars=global_vars,
                    logger=self.logger,
                    logging_tags=logging_tags,
                    pipeline_run=pipeline_run,
                )
                if not block_result:
                    self.logger.info(
                        f'Conditional block {conditional_block.uuid} evaluated as False '
                        f'for block {self.block.uuid}',
                        **logging_tags,
                    )
                result = result and block_result
            except Exception as conditional_err:
                self.logger.exception(
                    f'Failed to execute conditional block {conditional_block.uuid} '
                    f'for block {self.block.uuid}.',
                    **merge_dict(
                        logging_tags,
                        dict(
                            error=conditional_err,
                        ),
                    ),
                )
                result = False

        return result

    def _execute_callback(
        self,
        callback: str,
        global_vars: Dict,
        logging_tags: Dict,
        pipeline_run: PipelineRun,
        block_run_id: int = None,
        callback_kwargs: Dict = None,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
    ):
        """
        Execute the callback blocks.

        Args:
            callback: The callback type ('on_success' or 'on_failure').
            global_vars: Global variables for the block execution.
            logging_tags: Tags for logging.
            pipeline_run: The pipeline run object.
            dynamic_block_index: Index of the dynamic block.
            dynamic_upstream_block_uuids: List of UUIDs of the dynamic upstream blocks.
        """
        upstream_block_uuids_override = []
        if is_dynamic_block_child(self.block):
            if not self.block_run and block_run_id:
                self.block_run = BlockRun.query.get(block_run_id)
            if self.block_run:
                upstream_block_uuids_override.append(self.block_run.block_uuid)

        arr = []
        if self.block.callback_block:
            arr.append(self.block.callback_block)

        if self.block.callback_blocks:
            arr += self.block.callback_blocks

        for callback_block in arr:
            try:
                callback_block.execute_callback(
                    callback,
                    callback_kwargs=callback_kwargs,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    execution_partition=self.execution_partition,
                    global_vars=global_vars,
                    logger=self.logger,
                    logging_tags=logging_tags,
                    parent_block=self.block,
                    pipeline_run=pipeline_run,
                    upstream_block_uuids_override=upstream_block_uuids_override,
                )
            except Exception as callback_err:
                self.logger.exception(
                    f'Failed to execute {callback} callback block {callback_block.uuid} '
                    f'for block {self.block.uuid}.',
                    **merge_dict(
                        logging_tags,
                        dict(
                            error=callback_err,
                        ),
                    ),
                )

    def _run_commands(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        pipeline_run_id: int = None,
        **kwargs,
    ) -> List[str]:
        """
        Run the commands for the block.

        Args:
            block_run_id: The ID of the block run.
            global_vars: Global variables for the block execution.
            **kwargs: Additional keyword arguments.

        Returns:
            A list of command arguments.
        """
        cmd = (
            f'/app/run_app.sh '
            f'mage run {self.pipeline.repo_config.repo_path} {self.pipeline.uuid}'
        )
        options = [
            '--block-uuid',
            self.block_uuid,
            '--executor-type',
            'local_python',
        ]
        if self.execution_partition is not None:
            options += ['--execution-partition', self.execution_partition]
        if block_run_id is not None:
            options += ['--block-run-id', f'{block_run_id}']
        if pipeline_run_id:
            options += [
                '--pipeline-run-id',
                f'{pipeline_run_id}',
            ]
        if kwargs.get('template_runtime_configuration'):
            template_run_configuration = kwargs.get('template_runtime_configuration')
            options += [
                '--template-runtime-configuration',
                json.dumps(template_run_configuration),
            ]
        return cmd.split(' ') + options

    def __update_block_run_status(
        self,
        status: BlockRun.BlockRunStatus,
        block_run_id: int = None,
        callback_url: str = None,
        error_details: Dict = None,
        pipeline_run: PipelineRun = None,
        tags: Dict = None,
    ):
        """
        Update the status of block run by either updating the BlockRun db object or making
        API call

        Args:
            status (str): 'completed' or 'failed'
            block_run_id (int): the id of the block run
            callback_url (str): with format http(s)://[host]:[port]/api/block_runs/[block_run_id]
            tags (dict): tags used in logging
        """
        if tags is None:
            tags = dict()
        if not block_run_id and not callback_url:
            return
        try:
            if not block_run_id:
                block_run_id = int(callback_url.split('/')[-1])

            block_run = BlockRun.query.get(block_run_id)
            update_kwargs = dict(status=status)

            if status == BlockRun.BlockRunStatus.COMPLETED:
                update_kwargs['completed_at'] = datetime.now(tz=pytz.UTC)

            # Cannot save raw value in DB; it breaks:
            # sqlalchemy.exc.StatementError:
            # (builtins.TypeError) Object of type Py4JJavaError is not JSON serializable
            # [SQL: UPDATE block_run SET updated_at=CURRENT_TIMESTAMP, status=?, metrics=?
            # WHERE block_run.id = ?]

            # if BlockRun.BlockRunStatus.FAILED == status and error_details:
            #     update_kwargs['metrics'] = merge_dict(block_run.metrics or {}, dict(
            #         __error_details=error_details,
            #     ))

            block_run.update(**update_kwargs)
            return
        except Exception as err2:
            self.logger.exception(
                f'Failed to update block run status to {status} for block {self.block.uuid}.',
                **merge_dict(tags, dict(error=err2)),
            )

        block_run_data = dict(status=status)
        if error_details:
            block_run_data['error_details'] = error_details

        # Fall back to making API calls
        response = requests.put(
            callback_url,
            data=json.dumps({
                'block_run': block_run_data,
            }),
            headers={
                'Content-Type': 'application/json',
            },
        )
        self.logger.info(
            f'Callback response: {response.text}',
            **tags,
        )

    def build_tags(self, **kwargs):
        """
        Build tags for logging.

        Args:
            **kwargs: Additional keyword arguments.

        Returns:
            The built tags.
        """
        default_tags = dict(
            block_type=self.block.type,
            block_uuid=self.block_uuid,
            pipeline_uuid=self.pipeline.uuid,
        )
        if kwargs.get('block_run_id'):
            default_tags['block_run_id'] = kwargs.get('block_run_id')
        if kwargs.get('pipeline_run_id'):
            default_tags['pipeline_run_id'] = kwargs.get('pipeline_run_id')
        return merge_dict(kwargs.get('tags', {}), default_tags)
