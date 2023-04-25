from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from mage_ai.shared.hash import merge_dict
from typing import Dict


class K8sBlockExecutor(BlockExecutor):
    def __init__(self, pipeline, block_uuid: str, execution_partition: str = None):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.k8s_executor_config or dict()
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.block.executor_config)

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
        job_manager.run_job(
            cmd,
            k8s_config=self.executor_config,
        )
