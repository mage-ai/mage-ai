import traceback
from typing import Dict

from jinja2 import Template

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.constants import DEFAULT_NAMESPACE
from mage_ai.services.k8s.job_manager import JobManager as K8sJobManager
from mage_ai.settings.server import MAGE_CLUSTER_UUID
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name


class K8sPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline, execution_partition: str = None):
        super().__init__(pipeline, execution_partition=execution_partition)
        self.executor_config_dict = self.pipeline.repo_config.k8s_executor_config or dict()
        if self.pipeline.executor_config is not None:
            self.executor_config_dict = merge_dict(
                self.executor_config_dict,
                self.pipeline.executor_config,
            )
        self.executor_config = K8sExecutorConfig.load(config=self.executor_config_dict)

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
            global_vars=global_vars,
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
        global_vars: Dict = None,
        **kwargs,
    ) -> K8sJobManager:
        if global_vars is None:
            global_vars = dict()
        job_name_prefix = self._get_job_name_prefix(pipeline_run_id)

        if self.executor_config.namespace:

            namespace = Template(self.executor_config.namespace).render(
                variables=lambda x: global_vars.get(x) if global_vars else None,
                **get_template_vars()
            )
        else:
            namespace = DEFAULT_NAMESPACE

        return K8sJobManager(
            job_name=f'{MAGE_CLUSTER_UUID}-{job_name_prefix}-pipeline-{pipeline_run_id}',
            logger=self.logger,
            logging_tags=kwargs.get('tags', dict()),
            namespace=namespace,
        )

    @safe_db_query
    def _get_job_name_prefix(
        self,
        pipeline_run_id,
    ):
        if not self.executor_config.job_name_prefix:
            job_name_prefix = 'data-prep'
        else:
            job_name_prefix = self.executor_config.job_name_prefix
        if not pipeline_run_id:
            return job_name_prefix

        if '{trigger_name}' in job_name_prefix:
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            trigger = pipeline_run.pipeline_schedule
            job_name_prefix = job_name_prefix.format(
                trigger_name=clean_name(trigger.name).replace('_', '-'))

        return job_name_prefix
