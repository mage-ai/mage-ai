from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.aws.ecs import ecs
from requests import get
from typing import Dict


class EcsBlockExecutor(BlockExecutor):
    def execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = f'mage run {self.pipeline.repo_config.repo_name} {self.pipeline.uuid}'
        options = [f'--block_uuid {self.block_uuid}']
        if self.execution_partition is not None:
            options.append(f'--execution_partition {self.execution_partition}')
        if block_run_id is not None:
            ip = get('https://api.ipify.org').content.decode('utf8')
            callback_url = f'http://{ip}/api/block_runs/{block_run_id}'
            options.append(f'--callback_url {callback_url}')
        options_str = ' '.join(options)
        ecs.run_task(f'{cmd} {options_str}', ecs_config=self.pipeline.repo_config.ecs_config)
