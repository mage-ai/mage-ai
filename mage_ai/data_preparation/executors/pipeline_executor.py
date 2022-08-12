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
        update_status: bool = False,
    ) -> None:
        asyncio.run(self.pipeline.execute(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            update_status=update_status,
        ))
