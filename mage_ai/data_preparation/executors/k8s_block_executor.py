from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from typing import Dict


class K8sBlockExecutor(BlockExecutor):
    def _execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        job_manager = K8sJobManager(
            job_name=f'mage-data-prep-block-{block_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
        )
        cmd = self._run_commands(block_run_id, global_vars, **kwargs)
        job_manager.run_job(cmd)
