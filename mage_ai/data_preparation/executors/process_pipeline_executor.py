import os
import subprocess
from typing import Dict

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.services.k8s.config import K8sExecutorConfig


class ProcessPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline, execution_partition: str = None):
        super().__init__(pipeline, execution_partition=execution_partition)
        executor_config = self.pipeline.executor_config or dict()
        self.executor_config = K8sExecutorConfig.load(config=executor_config)

    def execute(
        self,
        pipeline_run_id: int = None,
        global_vars: Dict = None,
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
            '--executor-type',
            'local_python',
            '--execution-partition',
            self.execution_partition,
        ]
        if pipeline_run_id:
            command.extend(['--pipeline-run-id', f'{pipeline_run_id}'])

        proc = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out, err = proc.communicate()
        if proc.returncode != 0 and proc.returncode is not None:
            self.logger.error(
                'ProcessPipelineExecutor failed to execute with output: {}'.format(
                    out.decode('UTF-8')
                )
            )
            message = (
                err.decode('UTF-8')
                if err
                else 'ProcessPipelineExecutor failed to execute.'
            )
            raise ChildProcessError(message)
