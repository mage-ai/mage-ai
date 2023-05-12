import asyncio
from typing import Dict

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.hash import merge_dict


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
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        run_sensors: bool = True,
        run_tests: bool = True,
        update_status: bool = False,
        **kwargs,
    ) -> None:
        asyncio.run(self.pipeline.execute(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            run_sensors=run_sensors,
            run_tests=run_tests,
            update_status=update_status,
        ))
        self.logger_manager.output_logs_to_destination()

    def _build_tags(self, **kwargs):
        default_tags = dict(
            pipeline_uuid=self.pipeline.uuid,
        )
        if kwargs.get('pipeline_run_id'):
            default_tags['pipeline_run_id'] = kwargs.get('pipeline_run_id')
        return merge_dict(kwargs.get('tags', {}), default_tags)
