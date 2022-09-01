from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.services.aws.emr import emr
from mage_ai.services.aws.emr.resource_manager import EmrResourceManager
from mage_ai.services.aws.s3 import s3
from typing import Dict
import os


class PySparkBlockExecutor(BlockExecutor):
    def __init__(self, pipeline: Pipeline, block_uuid: str):
        super().__init__(pipeline, block_uuid)
        self.resource_manager = EmrResourceManager(
            pipeline.repo_config.s3_bucket,
            pipeline.repo_config.s3_path_prefix,
        )
        self.s3_bucket = pipeline.repo_config.s3_bucket
        self.s3_path_prefix = pipeline.repo_config.s3_path_prefix

    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        update_status: bool = False,
    ) -> None:
        """
        Run block in a spark cluster
        1. Upload block execution script to S3
        2. Launch or connect to an EMR spark cluster
        3. Submit a spark job
        """
        self.upload_block_execution_script(global_vars=global_vars)
        self.resource_manager.upload_bootstrap_script()
        self.submit_spark_job()

    @property
    def spark_script_path(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.spark_script_path_key)

    @property
    def spark_script_path_key(self) -> str:
        return os.path.join(
            self.s3_path_prefix,
            f'scripts/{self.pipeline.uuid}/{self.block_uuid}.py',
        )

    def upload_block_execution_script(self, global_vars: Dict = None) -> None:
        execution_script_code = template_env.get_template(
            'pipeline_execution/spark_script.jinja',
        ).render(
            block_uuid=f'\'{self.block_uuid}\'',
            global_vars=global_vars,
            pipeline_config=self.pipeline.to_dict(include_content=True),
            pipeline_uuid=self.pipeline.uuid,
            repo_config=self.pipeline.repo_config.to_dict(remote=True),
            spark_log_path=self.resource_manager.log_uri,
        )

        s3.Client(self.s3_bucket).upload(self.spark_script_path_key, execution_script_code)

    def submit_spark_job(self):
        step = {
            'name': f'run_mage_block_{self.pipeline.uuid}_{self.block_uuid}',
            'script_uri': self.spark_script_path,
            'script_args': [],
        }
        return emr.submit_spark_job(
            cluster_name=step['name'],
            steps=[step],
            bootstrap_script_path=self.resource_manager.bootstrap_script_path,
            emr_config=self.pipeline.repo_config.emr_config,
            log_uri=self.resource_manager.log_uri,
        )
