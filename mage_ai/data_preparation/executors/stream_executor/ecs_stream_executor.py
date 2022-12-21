from uuid import uuid4
from mage_ai.data_preparation.executors.stream_executor import StreamExecutor
from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
from requests import get

import json

from mage_ai.orchestration.db.models import BlockRun


class EcsStreamExecutor(StreamExecutor):
    def __init__(self, pipeline, stream_id: str, execution_partition: str = None):
        super().__init__(pipeline, stream_id, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.ecs_config
        
    def execute(
        self,
        **kwargs,
    ) -> None:
        block_runs = kwargs.get('executable_block_runs', [])
        execution_partition = kwargs.get('execution_partition')
        pipeline_run_id = kwargs.get('pipeline_run_id')
        cmd = f'mage run {self.pipeline.repo_config.repo_name} {self.pipeline.uuid}'
        options = [
            f'--stream {self.stream_id}',
            f'--execution_partition {execution_partition}',
            f'--pipeline_run_id {pipeline_run_id}',
            '--executor_type standard',
        ]
        runtime_variables = kwargs.get('runtime_variables', [])
        if runtime_variables:
            runtime_var_arg = '--runtime-vars'
            for k, v in runtime_variables.items():
                runtime_var_arg += f' {k} {json.dumps(v)}'
            options.append(runtime_var_arg)

        ip = get('https://api.ipify.org').content.decode('utf8')
        callback_url = f'http://{ip}:6789/api/block_runs'
        options.append(f'--callback_url {callback_url}')
        options_str = ' '.join(options)

        block_runs_for_stream = \
            list(filter(lambda br: self.stream_id in br.block_uuid, block_runs))
        for block_run in block_runs_for_stream:
            block_run.update(status=BlockRun.BlockRunStatus.RUNNING)

        ecs_config = self.pipeline.ecs_config
        ecs_task_manager = EcsTaskManager(ecs_config.get('cluster'))
        ecs_task_manager.create_task(
            str(uuid4()),
            ecs_config.get('task_definition'),
            ecs_config.get('container_name'),
            command=f'{cmd} {options_str}',
            cpu=ecs_config.get('cpu'),
            memory=ecs_config.get('memory'),
        )
