import traceback
from typing import Dict

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.services.k8s.config import K8sExecutorConfig
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
            job_manager = K8sJobManager(
                job_name=f'mage-data-prep-pipeline-{pipeline_run_id}',
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
        cmd = f'/app/run_app.sh '\
              f'mage run {self.pipeline.repo_config.repo_path} '\
              f'{self.pipeline.uuid}'
        options = [
            '--executor-type local_python',
        ]
        if self.execution_partition is not None:
            options.append(f'--execution-partition {self.execution_partition}')
        if pipeline_run_id is not None:
            options.append(f'--pipeline-run-id {pipeline_run_id}')
        options_str = ' '.join(options)
        job_manager = K8sJobManager(
            job_name=f'mage-data-prep-pipeline-{pipeline_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
        )
        job_manager.run_job(
            f'{cmd} {options_str}',
            k8s_config=self.executor_config,
        )
