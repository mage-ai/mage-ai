import traceback
from typing import Dict

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.constants import DEFAULT_NAMESPACE
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from mage_ai.shared.hash import merge_dict


class K8sPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline, execution_partition: str = None):
        super().__init__(pipeline, execution_partition=execution_partition)
        self.executor_config = self.pipeline.repo_config.k8s_executor_config or dict()
        if self.pipeline.executor_config is not None:
            self.executor_config = merge_dict(self.executor_config, self.pipeline.executor_config)
        self.executor_config = K8sExecutorConfig.load(config=self.executor_config)

    def cancel(
        self,
        pipeline_run_id: int = None,
    ):
        if pipeline_run_id is None:
            return
        try:
            job_manager = self.get_job_manager(
                pipeline_run_id=pipeline_run_id,
            )
            job_manager.delete_job()
        except Exception:
            traceback.print_exc()

    def execute(
        self,
        pipeline_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        job_manager = self.get_job_manager(
            pipeline_run_id=pipeline_run_id,
            **kwargs,
        )
        cmd = self._run_commands(
            global_vars=global_vars,
            pipeline_run_id=pipeline_run_id,
            **kwargs
        )
        job_manager.run_job(
            cmd,
            k8s_config=self.executor_config,
        )

    def get_job_manager(
        self,
        pipeline_run_id: int = None,
        **kwargs,
    ) -> K8sJobManager:
        if not self.executor_config.job_name_prefix:
            job_name_prefix = 'data-prep'
        else:
            job_name_prefix = self.executor_config.job_name_prefix

        if self.executor_config.namespace:
            namespace = self.executor_config.namespace
        else:
            namespace = DEFAULT_NAMESPACE

        return K8sJobManager(
            job_name=f'mage-{job_name_prefix}-pipeline-{pipeline_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
            namespace=namespace,
        )
