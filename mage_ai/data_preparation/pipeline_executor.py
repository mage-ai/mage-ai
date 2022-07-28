from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.services.emr import emr
from mage_ai.services.s3 import s3

import asyncio


class PipelineExecutor:
    def __init__(self, pipeline):
        self.pipeline = pipeline

    @classmethod
    def get_executor(self, pipeline: Pipeline):
        if pipeline.type == PipelineType.PYSPARK:
            return PySparkPipelineExecutor(pipeline)
        else:
            return PipelineExecutor(pipeline)

    def execute(self, analyze_outputs=False, global_vars=None, update_status=False):
        asyncio.run(self.pipeline.execute(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            update_status=update_status,
        ))


class PySparkPipelineExecutor(PipelineExecutor):
    def execute(self, analyze_outputs=False, global_vars=None, update_status=False):
        """
        Run pipeline in a spark cluster
        1. Upload pipeline execution script to S3
        2. Launch or connect to an EMR spark cluster
        3. Submit a spark job
        """
        self.upload_pipeline_execution_script(global_vars=global_vars)
        self.submit_spark_job()

    def upload_pipeline_execution_script(self, global_vars=None):
        execution_script_code = template_env.get_template(
            'pipeline_execution/spark_script.jinja',
        ).render(
            global_vars=global_vars,
            pipeline_config=self.pipeline.to_dict(include_content=True),
            pipeline_uuid=self.pipeline.uuid,
            repo_config=self.pipeline.repo_config.to_dict(),
            spark_log_path=self.pipeline.remote_log_path,
        )
        s3.Client('mage-spark').upload(self.pipeline.remote_script_path, execution_script_code)

    def submit_spark_job(self):
        step = {
            'name': f'run_mage_pipeline_{self.pipeline.uuid}',
            'script_uri': self.pipeline.remote_script_path,
            'script_args': [],
        }
        return emr.submit_spark_job(
            cluster_name=step['name'],
            steps=[step],
        )
