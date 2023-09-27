import posixpath

from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.services.aws.s3 import s3


class EmrResourceManager:
    def __init__(
        self,
        s3_bucket: str,
        s3_path_prefix: str,
        bootstrap_script_path: str = None,
    ):
        self.s3_bucket = s3_bucket
        self.s3_path_prefix = s3_path_prefix or ''
        if self.s3_bucket is None:
            raise Exception('Please specify the correct s3_bucket to initialize EMR cluster.'
                            'Add "remote_variables_dir: s3://[bucket]/[path]" to'
                            ' project\'s metadata.yaml file.'
                            )
        self.local_bootstrap_script_path = bootstrap_script_path

    @property
    def bootstrap_script_path(self) -> str:
        return posixpath.join('s3://', self.s3_bucket, self.bootstrap_script_path_key)

    @property
    def bootstrap_script_path_key(self) -> str:
        return posixpath.join(self.s3_path_prefix, 'scripts/emr_bootstrap.sh')

    @property
    def log_uri(self) -> str:
        return posixpath.join('s3://', self.s3_bucket, self.s3_path_prefix, 'logs')

    def upload_bootstrap_script(self) -> None:
        if self.local_bootstrap_script_path is None:
            bootstrap_script_code = template_env.get_template(
                'pipeline_execution/emr_bootstrap.sh',
            ).render()
        else:
            with open(self.local_bootstrap_script_path, 'r', encoding='utf-8') as f:
                bootstrap_script_code = f.read()
        s3.Client(self.s3_bucket).upload(self.bootstrap_script_path_key, bootstrap_script_code)
