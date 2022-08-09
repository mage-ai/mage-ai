from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.services.s3 import s3
import os


class EmrResourceManager:
    def __init__(self, s3_bucket, s3_path_prefix):
        self.s3_bucket = s3_bucket
        self.s3_path_prefix = s3_path_prefix

    @property
    def bootstrap_script_path(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.bootstrap_script_path_key)

    @property
    def bootstrap_script_path_key(self) -> str:
        return os.path.join(self.s3_path_prefix, 'scripts/emr_bootstrap.sh')

    @property
    def log_uri(self) -> str:
        return os.path.join('s3://', self.s3_bucket, self.s3_path_prefix, 'logs')

    def upload_bootstrap_script(self) -> None:
        bootstrap_script_code = template_env.get_template(
            'pipeline_execution/emr_bootstrap.sh',
        ).render()        
        s3.Client(self.s3_bucket).upload(self.bootstrap_script_path_key, bootstrap_script_code)
