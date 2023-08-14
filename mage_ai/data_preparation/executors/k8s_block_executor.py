from typing import Dict

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from mage_ai.shared.hash import merge_dict
from mage_ai.services.k8s.constants import DEFAULT_NAMESPACE


class K8sBlockExecutor(BlockExecutor):
    RETRYABLE = False

    def __init__(self, pipeline, block_uuid: str, execution_partition: str = None):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.k8s_executor_config or dict()
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.block.executor_config)
        self.executor_config = K8sExecutorConfig.load(config=self.executor_config)

    def _execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        if not self.executor_config.job_name_prefix:
            job_name_prefix = 'data-prep'
        else:
            job_name_prefix = self.executor_config.job_name_prefix

        if self.executor_config.namespace:
            namespace = self.executor_config.namespace
        else:
            namespace = DEFAULT_NAMESPACE
        job_manager = K8sJobManager(
            job_name=f'mage-{job_name_prefix}-block-{block_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
            namespace=namespace,
        )
        cmd = self._run_commands(
            block_run_id=block_run_id,
            global_vars=global_vars,
            **kwargs
        )
        job_manager.run_job(
            cmd,
            k8s_config=self.executor_config,
        )
