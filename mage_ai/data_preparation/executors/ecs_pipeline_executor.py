from typing import Dict

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.services.aws.ecs import ecs
from mage_ai.shared.hash import merge_dict


class EcsPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline, execution_partition: str = None):
        super().__init__(pipeline, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.ecs_config or dict()
        if self.pipeline.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.pipeline.executor_config)

    def execute(
        self,
        pipeline_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = self._run_commands(
            global_vars=global_vars,
            pipeline_run_id=pipeline_run_id,
            **kwargs
        )
        ecs.run_task(' '.join(cmd), ecs_config=self.executor_config)
