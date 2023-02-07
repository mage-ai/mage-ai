from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from requests import get
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
        job_manager = K8sJobManager(
            job_name=f'mage-data-prep-{block_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
        )
        job_manager.run_job(f'{cmd} {options_str}')
