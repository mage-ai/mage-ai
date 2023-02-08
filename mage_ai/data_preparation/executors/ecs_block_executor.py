from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.aws.ecs import ecs
from mage_ai.shared.hash import merge_dict
from requests import get
from typing import Dict


class EcsBlockExecutor(BlockExecutor):
    def __init__(self, pipeline, block_uuid: str, execution_partition: str = None):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.ecs_config
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.block.executor_config)

    def execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = f'mage run {self.pipeline.repo_config.repo_name} {self.pipeline.uuid}'
        options = [
            f'--block-uuid {self.block_uuid}',
            '--executor-type local_python',
        ]
        if self.execution_partition is not None:
            options.append(f'--execution-partition {self.execution_partition}')
        if block_run_id is not None:
            ip = get('https://api.ipify.org').content.decode('utf8')
            callback_url = f'http://{ip}:6789/api/block_runs/{block_run_id}'
            options.append(f'--callback-url {callback_url}')
        options_str = ' '.join(options)
        ecs.run_task(f'{cmd} {options_str}', ecs_config=self.pipeline.repo_config.ecs_config)
