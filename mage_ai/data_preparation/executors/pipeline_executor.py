from mage_ai.data_preparation.models.pipeline import Pipeline
from typing import Dict
import asyncio


class PipelineExecutor:
    def __init__(self, pipeline: Pipeline):
        self.pipeline = pipeline

    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        run_sensors: bool = True,
        run_tests: bool = True,
        update_status: bool = False,
    ) -> None:
        asyncio.run(self.pipeline.execute(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            run_sensors=run_sensors,
            run_tests=run_tests,
            update_status=update_status,
        ))
