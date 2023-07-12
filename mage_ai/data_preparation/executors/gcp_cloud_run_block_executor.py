import os
from typing import Dict

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.services.gcp.cloud_run import cloud_run
from mage_ai.shared.hash import merge_dict


class GcpCloudRunBlockExecutor(BlockExecutor):
    RETRYABLE = False

    def __init__(self, pipeline, block_uuid: str, execution_partition: str = None):
        super().__init__(pipeline, block_uuid, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.gcp_cloud_run_config or dict()
        if os.getenv('GCP_REGION'):
            self.executor_config['region'] = os.getenv('GCP_REGION')
        if os.getenv('GCP_PROJECT_ID'):
            self.executor_config['project_id'] = os.getenv('GCP_PROJECT_ID')
        if self.block.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.block.executor_config)

    def execute(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        cmd = self._run_commands(block_run_id, global_vars, **kwargs)
        cloud_run.run_job(
            ' '.join(cmd),
            f'mage-data-prep-block-{block_run_id}',
            cloud_run_config=self.executor_config,
        )
