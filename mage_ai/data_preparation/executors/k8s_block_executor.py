from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from typing import Dict


class K8sBlockExecutor(BlockExecutor):
    def execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = f'/app/run_app.sh '\
              f'mage run {self.pipeline.repo_config.repo_path} {self.pipeline.uuid}'
        options = [
            f'--block_uuid {self.block_uuid}',
            '--executor_type local_python',
        ]
        if self.execution_partition is not None:
            options.append(f'--execution_partition {self.execution_partition}')
        options_str = ' '.join(options)
        job_manager = K8sJobManager()
        job_manager.run_job(f'{cmd} {options_str}')
