from mage_ai.data_preparation.logger_manager import LoggerManager
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.pipeline import Pipeline
from typing import Dict
import asyncio


class PipelineExecutor:
    def __init__(self, pipeline: Pipeline, execution_partition: str = None):
        self.pipeline = pipeline
        self.execution_partition = execution_partition
        logger_manager = LoggerManager.get_logger(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.execution_partition,
        )
        self.logger = DictLogger(logger_manager)

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
