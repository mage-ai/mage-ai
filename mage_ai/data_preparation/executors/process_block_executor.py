import os
import subprocess
from typing import Dict

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.shared.hash import merge_dict


class ProcessBlockExecutor(BlockExecutor):
    def __init__(
        self, pipeline, block_uuid: str, execution_partition: str = None, **kwargs
    ):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.executor_config or dict()
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(
                self.executor_config, self.block.executor_config
            )

    def execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        pipeline_run_id: int = None,
        **kwargs,
    ) -> None:
        venv_path = os.path.join(self.pipeline.pipeline_variables_dir, '.venv')
        command = [
            os.path.join(venv_path, 'bin', 'python'),
            '-m',
            'mage_ai.cli.main',
            'run',
            self.pipeline.repo_config.repo_path,
            self.pipeline.uuid,
            '--block-uuid',
            self.block_uuid,
            '--executor-type',
            'local_python',
            '--execution-partition',
            self.execution_partition,
            '--block-run-id',
            f'{block_run_id}',
        ]
        if pipeline_run_id:
            command.extend(['--pipeline-run-id', f'{pipeline_run_id}'])

        proc = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out, err = proc.communicate()
        if proc.returncode != 0 and proc.returncode is not None:
            self.logger.error(
                'ProcessBlockExecutor failed to execute with output: {}'.format(
                    out.decode('UTF-8')
                )
            )
            message = (
                err.decode('UTF-8')
                if err
                else 'ProcessBlockExecutor failed to execute.'
            )
            raise ChildProcessError(message)
