from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Dict, List

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import BlockRun, PipelineRun
from mage_ai.orchestration.execution_process_manager import execution_process_manager
from mage_ai.orchestration.metrics.pipeline_run import calculate_metrics

from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict

import json
import requests


class StreamExecutor:
    def __init__(self, pipeline: Pipeline, stream_id: str, execution_partition: str = None):
        if pipeline.type != PipelineType.INTEGRATION:
            raise Exception('Stream executors only execute data integration pipelines!')
        self.pipeline = pipeline
        self.stream_id = stream_id
        self.execution_partition = execution_partition
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        )
        self.logger = DictLogger(self.logger_manager.logger)

    def execute(
        self,
        variables: Dict = dict(),
        runtime_arguments: Dict = dict(),
        pipeline_run_id: int = None,
        executable_block_runs: List[BlockRun] = None,
        tags: Dict = dict(),
        all_block_runs: List[BlockRun] = None,
        callback_url: str = None,
    ):
        print('---------------EXECUTING STREAM EXECUTOR!---------------')
        from mage_ai.orchestration.pipeline_scheduler import run_block
        pipeline_run = PipelineRun.query.get(pipeline_run_id)
        all_streams = self.pipeline.streams(variables)
        stream = find(lambda s: s['tap_stream_id'] == self.stream_id, all_streams)
        
        data_loader_block = self.pipeline.data_loader
        data_exporter_block = self.pipeline.data_exporter

        tap_stream_id = stream['tap_stream_id']
        destination_table = stream.get('destination_table', tap_stream_id)

        if all_block_runs is None:
            all_block_runs = BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run_id)

        if executable_block_runs is None:
            executable_block_runs = all_block_runs

        block_runs_for_stream = list(filter(lambda br: tap_stream_id in br.block_uuid, executable_block_runs))
        if len(block_runs_for_stream) == 0:
            return

        indexes = [0]
        for br in block_runs_for_stream:
            parts = br.block_uuid.split(':')
            if len(parts) >= 3:
                indexes.append(int(parts[2]))
        max_index = max(indexes)

        all_block_runs_for_stream = list(filter(
            lambda br: tap_stream_id in br.block_uuid,
            all_block_runs,
        ))
        all_indexes = [0]
        for br in all_block_runs_for_stream:
            parts = br.block_uuid.split(':')
            if len(parts) >= 3:
                all_indexes.append(int(parts[2]))
        max_index_for_stream = max(all_indexes)

        for idx in range(max_index + 1):
            block_runs_in_order = []
            current_block = data_loader_block

            while True:
                block_runs_in_order.append(
                    find(
                        lambda b: b.block_uuid == f'{current_block.uuid}:{tap_stream_id}:{idx}',
                        all_block_runs,
                    )
                )
                downstream_blocks = current_block.downstream_blocks
                if len(downstream_blocks) == 0:
                    break
                current_block = downstream_blocks[0]

            data_loader_uuid = f'{data_loader_block.uuid}:{tap_stream_id}:{idx}'
            data_exporter_uuid = f'{data_exporter_block.uuid}:{tap_stream_id}:{idx}'

            data_loader_block_run = find(
                lambda b: b.block_uuid == data_loader_uuid,
                all_block_runs,
            )
            data_exporter_block_run = find(
                lambda b: b.block_uuid == data_exporter_uuid,
                all_block_runs,
            )
            if not data_loader_block_run or not data_exporter_block_run:
                continue

            transformer_block_runs = [br for br in block_runs_in_order if br.block_uuid not in [
                data_loader_uuid,
                data_exporter_uuid,
            ]]

            index = stream.get('index', idx)

            shared_dict = dict(
                destination_table=destination_table,
                index=index,
                is_last_block_run=(index == max_index_for_stream),
                selected_streams=[
                    tap_stream_id,
                ],
            )
            block_runs_and_configs = [
                (data_loader_block_run, shared_dict),
            ] + [(br, shared_dict) for br in transformer_block_runs] + [
                (data_exporter_block_run, shared_dict),
            ]

            for idx2, tup in enumerate(block_runs_and_configs):
                block_run, template_runtime_configuration = tup

                block_run_callback_url = f'{callback_url}/{block_run.id}'

                tags_updated = merge_dict(tags, dict(
                    block_run_id=block_run.id,
                    block_uuid=block_run.block_uuid,
                ))
                if callback_url:
                    self.__update_block_run_status(block_run_callback_url, BlockRun.BlockRunStatus.RUNNING)
                else:
                    block_run.update(
                        started_at=datetime.now(),
                        status=BlockRun.BlockRunStatus.RUNNING,
                    )
                self.logger.info(
                    f'Start a process for BlockRun {block_run.id}',
                    **tags_updated,
                )

                output = run_block(
                    pipeline_run_id,
                    block_run.id,
                    variables,
                    tags_updated,
                    callback_url=block_run_callback_url,
                    pipeline_type=PipelineType.INTEGRATION,
                    verify_output=False,
                    runtime_arguments=runtime_arguments,
                    schedule_after_complete=False,
                    template_runtime_configuration=template_runtime_configuration,
                )
                if 'output' in output and len(output['output']) >= 1:
                    execution_process_manager.set_block_process(
                        pipeline_run_id,
                        block_run.id,
                        output['output'][0],
                    )

                if f'{data_loader_block.uuid}:{tap_stream_id}' in block_run.block_uuid or \
                   f'{data_exporter_block.uuid}:{tap_stream_id}' in block_run.block_uuid:

                    tags2 = merge_dict(tags_updated.get('tags', {}), dict(
                        destination_table=destination_table,
                        index=index,
                        stream=tap_stream_id,
                    ))
                    self.logger.info(
                        f'Calculate metrics for pipeline run {pipeline_run.id} started.',
                        **tags_updated,
                        tags=tags2,
                    )
                    calculate_metrics(pipeline_run)
                    self.logger.info(
                        f'Calculate metrics for pipeline run {pipeline_run.id} completed.',
                        **tags_updated,
                        tags=merge_dict(tags2, dict(metrics=pipeline_run.metrics)),
                    )

    def __update_block_run_status(self, callback_url: str, status: str, tags: dict = None):
        response = requests.put(
            callback_url,
            data=json.dumps({
                'block_run': {
                    'status': status,
                },
            }),
            headers={
                'Content-Type': 'application/json',
            },
        )
        self.logger.info(
            f'Callback response: {response.text}',
            **tags,
        )
