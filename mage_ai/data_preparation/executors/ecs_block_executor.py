from typing import Dict

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.aws.ecs import ecs
from mage_ai.shared.hash import merge_dict


class EcsBlockExecutor(BlockExecutor):
    RETRYABLE = False

    def __init__(self, pipeline, block_uuid: str, execution_partition: str = None):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.ecs_config or dict()
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.block.executor_config)

    def _execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = self._run_commands(block_run_id, global_vars, **kwargs)
        ecs.run_task(' '.join(cmd), ecs_config=self.executor_config)
