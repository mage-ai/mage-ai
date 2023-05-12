import traceback
from typing import Dict

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager


class K8sPipelineExecutor(PipelineExecutor):
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
              f'python mage_ai/cli/main.py run {self.pipeline.repo_config.repo_path} '\
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
        job_manager.run_job(f'{cmd} {options_str}')
