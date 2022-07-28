from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.services.emr import emr
from mage_ai.services.s3 import s3
from typing import Dict
import asyncio
import os


class PipelineExecutor:
    def __init__(self, pipeline):
        self.pipeline = pipeline

    @classmethod
    def get_executor(self, pipeline: Pipeline):
        if pipeline.type == PipelineType.PYSPARK:
            return PySparkPipelineExecutor(pipeline)
        else:
            return PipelineExecutor(pipeline)

    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        update_status: bool = False,
    ) -> None:
        asyncio.run(self.pipeline.execute(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            update_status=update_status,
        ))


class PySparkPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline):
        super().__init__(pipeline)
        path_parts = self.pipeline.remote_variables_dir.replace('s3://', '').split('/')
        self.s3_bucket = path_parts.pop(0)
        self.s3_path_prefix = '/'.join(path_parts)

    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        update_status: bool = False,
    ) -> None:
        """
        Run pipeline in a spark cluster
        1. Upload pipeline execution script to S3
        2. Launch or connect to an EMR spark cluster
        3. Submit a spark job
        """
        self.upload_pipeline_execution_script(global_vars=global_vars)
        self.submit_spark_job()

    @property
    def bootstrap_script_path(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.bootstrap_script_path_key)

    @property
    def bootstrap_script_path_key(self) -> str:
        return os.path.join(self.s3_path_prefix, 'scripts/emr_bootstrap.sh')

    @property
    def log_uri(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.s3_path_prefix, 'logs')

    @property
    def pipeline_script_path(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.pipeline_script_path_key)

    @property
    def pipeline_script_path_key(self) -> str:
        return os.path.join(self.s3_path_prefix, f'scripts/{self.pipeline.uuid}.py')

    def upload_pipeline_execution_script(self, global_vars: Dict = None) -> None:
        execution_script_code = template_env.get_template(
            'pipeline_execution/spark_script.jinja',
        ).render(
            global_vars=global_vars,
            pipeline_config=self.pipeline.to_dict(include_content=True),
            pipeline_uuid=self.pipeline.uuid,
            repo_config=self.pipeline.repo_config.to_dict(remote=True),
            spark_log_path=self.log_uri,
        )
        bootstrap_script_code = template_env.get_template(
            'pipeline_execution/emr_bootstrap.sh',
        ).render()
        s3.Client(self.s3_bucket).upload(self.pipeline_script_path_key, execution_script_code)
        s3.Client(self.s3_bucket).upload(self.bootstrap_script_path_key, bootstrap_script_code)

    def submit_spark_job(self):
        step = {
            'name': f'run_mage_pipeline_{self.pipeline.uuid}',
            'script_uri': self.pipeline_script_path,
            'script_args': [],
        }
        return emr.submit_spark_job(
            cluster_name=step['name'],
            steps=[step],
            bootstrap_script_path=self.bootstrap_script_path,
            emr_config=self.pipeline.repo_config.emr_config,
            log_uri=self.log_uri,
        )
