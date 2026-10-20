import asyncio
import copy
import logging
import os
import traceback
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime
from typing import Callable, Dict, List, Union

import pytz
import yaml
from jinja2 import Template

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.shared.retry import RetryConfig
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.retry import retry
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class StreamingPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline, **kwargs):
        super().__init__(pipeline, **kwargs)
        # TODO: Support custom log destination for streaming pipelines
        self.parse_and_validate_blocks()
        self.retry_metadata = dict(attempts=0)

    def parse_and_validate_blocks(self):
        """
        Find the first valid streaming pipeline is in the structure:
        source -> transformer1 -> sink2
               -> transformer2 -> sink2
               -> transformer3 -> sink3
        """
        blocks = self.pipeline.blocks_by_uuid.values()
        source_blocks = []
        sink_blocks = []
        transformer_blocks = []
        for b in blocks:
            if b.type == BlockType.DATA_LOADER:
                # Data loader block should be root block
                if len(b.upstream_blocks or []) > 0:
                    raise Exception(f'Data loader {b.uuid} can\'t have upstream blocks.')
                if len(b.downstream_blocks or []) < 1:
                    raise Exception(f'Data loader {b.uuid} must have at least one transformer or'
                                    ' data exporter as the downstream block.')
                source_blocks.append(b)
            if b.type == BlockType.DATA_EXPORTER:
                # Data exporter block should be leaf block
                if len(b.downstream_blocks or []) > 0:
                    raise Exception(f'Data expoter {b.uuid} can\'t have downstream blocks.')
                if len(b.upstream_blocks or []) != 1:
                    raise Exception(f'Data exporter {b.uuid} must have a transformer or data'
                                    ' loader as the upstream block.')
                sink_blocks.append(b)
            if b.type == BlockType.TRANSFORMER:
                # Each transformer block can only have one upstream block
                if len(b.upstream_blocks or []) != 1:
                    raise Exception(f'Transformer {b.uuid} should (only) have one upstream block.')
                transformer_blocks.append(b)

        if len(source_blocks) != 1:
            raise Exception('Please provide (only) one data loader block as the source.')

        self.source_block = source_blocks[0]
        self.sink_blocks = sink_blocks

    def execute(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
        pipeline_run_id: int = None,
        retry_config: Dict = None,
        **kwargs,
    ) -> None:
        # TODOs:
        # 1. Support multiple sources and sinks
        # 2. Support flink pipeline

        tags = self.build_tags(pipeline_run_id=pipeline_run_id, **kwargs)
        self.logging_tags = tags
        if build_block_output_stdout:
            stdout_logger = logging.getLogger('streaming_pipeline_executor')
            self.logger = DictLogger(stdout_logger)
            stdout = build_block_output_stdout(self.pipeline.uuid)
        else:
            self.logger = DictLogger(self.logger_manager.logger, logging_tags=tags)
            stdout = StreamToLogger(self.logger, logging_tags=tags)
        try:
            if retry_config is None:
                retry_config = self.pipeline.retry_config or dict()
            infinite_retries = False if retry_config else True

            if type(retry_config) is not RetryConfig:
                retry_config = RetryConfig.load(config=retry_config)

            @retry(
                retries=retry_config.retries,
                delay=retry_config.delay,
                max_delay=retry_config.max_delay,
                exponential_backoff=retry_config.exponential_backoff,
                logger=self.logger,
                logging_tags=self.logging_tags,
                retry_metadata=self.retry_metadata,
            )
            def __execute_with_retry():
                with redirect_stdout(stdout):
                    with redirect_stderr(stdout):
                        self.__execute_in_python(
                            build_block_output_stdout=build_block_output_stdout,
                            global_vars=global_vars,
                            pipeline_run_id=pipeline_run_id,
                        )
            __execute_with_retry()
        except Exception as e:
            if not build_block_output_stdout:
                self.logger.exception(
                        f'Failed to execute streaming pipeline {self.pipeline.uuid}',
                        **merge_dict(dict(error=e), tags),
                    )
            if not infinite_retries:
                # If pipeline retry config is present, fail the pipeline after the retries
                self.__update_pipeline_run_status(
                    pipeline_run_id,
                    PipelineRun.PipelineRunStatus.FAILED,
                    error=e,
                )

            raise e

    def __execute_in_python(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
        pipeline_run_id: int = None,

    ):
        from mage_ai.streaming.sinks.sink_factory import SinkFactory
        from mage_ai.streaming.sources.base import SourceConsumeMethod
        from mage_ai.streaming.sources.source_factory import SourceFactory

        if global_vars is None:
            global_vars = dict()

        # Initialize source block
        if self.source_block.language == BlockLanguage.PYTHON:
            source = SourceFactory.get_python_source(
                self.source_block.content,
                global_vars=global_vars,
            )
        else:
            # Default to YAML config
            source_config = self.__interpolate_vars(
                self.source_block.content,
                global_vars=global_vars,
            )
            source = SourceFactory.get_source(
                source_config,
                checkpoint_path=os.path.join(
                    self.pipeline.pipeline_variables_dir,
                    'streaming_checkpoint',
                ),
            )

        # Initialize destination blocks
        sinks_by_uuid = dict()
        for sink_block in self.sink_blocks:
            if sink_block.language == BlockLanguage.PYTHON:
                sinks_by_uuid[sink_block.uuid] = SinkFactory.get_python_sink(
                    sink_block.content,
                    global_vars=global_vars,
                )
            else:
                sinks_by_uuid[sink_block.uuid] = SinkFactory.get_sink(
                    self.__interpolate_vars(sink_block.content, global_vars=global_vars),
                    buffer_path=os.path.join(
                        self.pipeline.pipeline_variables_dir,
                        'buffer',
                    ),
                )

        def __deepcopy(data):
            if data is None:
                return data
            if type(data) is list:
                data_copy = []
                for item in data:
                    data_copy.append(__deepcopy(item))
                return data_copy
            try:
                return copy.deepcopy(data)
            except Exception:
                return copy.copy(data)

        def handle_batch_events_recursively(curr_block, outputs_by_block: Dict, **kwargs):
            curr_block_output = outputs_by_block[curr_block.uuid]
            for downstream_block in curr_block.downstream_blocks:
                if downstream_block.type == BlockType.TRANSFORMER:
                    execute_block_kwargs = dict(
                        global_vars=kwargs,
                        input_args=[__deepcopy(curr_block_output)],
                        logger=self.logger,
                    )
                    if build_block_output_stdout:
                        execute_block_kwargs['build_block_output_stdout'] = \
                            build_block_output_stdout
                    outputs_by_block[downstream_block.uuid] = \
                        downstream_block.execute_block(
                            **execute_block_kwargs,
                    )['output']
                elif downstream_block.type == BlockType.DATA_EXPORTER:
                    sinks_by_uuid[downstream_block.uuid].batch_write(
                        __deepcopy(curr_block_output))
                if downstream_block.downstream_blocks:
                    handle_batch_events_recursively(
                        downstream_block,
                        outputs_by_block,
                        **kwargs,
                    )

        def handle_batch_events(messages: List[Union[Dict, str]], **kwargs):
            # Handle the events with DFS

            outputs_by_block = dict()
            outputs_by_block[self.source_block.uuid] = messages

            handle_batch_events_recursively(
                self.source_block,
                outputs_by_block,
                **merge_dict(global_vars, kwargs),
            )

        async def handle_event_async(message, **kwargs):
            outputs_by_block = dict()
            outputs_by_block[self.source_block.uuid] = [message]

            handle_batch_events_recursively(
                self.source_block,
                outputs_by_block,
                **merge_dict(global_vars, kwargs),
            )

        def handle_event(message, **kwargs):
            outputs_by_block = dict()
            outputs_by_block[self.source_block.uuid] = [message]

            handle_batch_events_recursively(
                self.source_block,
                outputs_by_block,
                **merge_dict(global_vars, kwargs),
            )

        # Long running method
        try:
            if source.consume_method == SourceConsumeMethod.BATCH_READ:
                source.batch_read(handler=handle_batch_events)
            elif source.consume_method == SourceConsumeMethod.READ_ASYNC:
                loop = asyncio.get_event_loop()
                if loop is not None:
                    loop.run_until_complete(source.read_async(handler=handle_event_async))
                else:
                    asyncio.run(source.read_async(handler=handle_event_async))
            elif source.consume_method == SourceConsumeMethod.READ:
                source.read(handler=handle_event)
        finally:
            source.destroy()
            for sink in sinks_by_uuid.values():
                sink.destroy()

    @safe_db_query
    def __update_pipeline_run_status(
        self,
        pipeline_run_id: int,
        status: PipelineRun.PipelineRunStatus,
        error: Exception = None,
    ):
        if not pipeline_run_id or not status:
            return
        pipeline_run = PipelineRun.query.get(pipeline_run_id)
        pipeline_run.update(
            status=status,
            completed_at=datetime.now(tz=pytz.UTC),
        )
        if status == PipelineRun.PipelineRunStatus.FAILED:
            asyncio.run(UsageStatisticLogger().pipeline_run_ended(pipeline_run))
            error_msg = None
            stacktrace = None
            if error is not None:
                error_msg = str(error)
                stacktrace = traceback.format_exc()
            notification_sender = self.pipeline.get_notification_sender()
            notification_sender.send_pipeline_run_failure_message(
                pipeline=self.pipeline,
                pipeline_run=pipeline_run,
                error=error_msg,
                stacktrace=stacktrace,
            )

    def __execute_in_flink(self):
        """
        TODO: Implement this method
        """
        pass

    def __interpolate_vars(self, content: str, global_vars: Dict = None):
        if global_vars is None:
            global_vars = dict()
        config_file = Template(content).render(
            variables=lambda x: global_vars.get(x) if global_vars else None,
            **get_template_vars()
        )
        return yaml.safe_load(config_file)
