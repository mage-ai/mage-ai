from dataclasses import dataclass

from botocore.exceptions import ClientError

from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.aws.s3 import s3
from mage_ai.shared.config import BaseConfig


@dataclass
class S3Config(BaseConfig):
    bucket: str
    prefix: str
    aws_access_key_id: str = None
    aws_secret_access_key: str = None
    endpoint_url: str = None


class S3LoggerManager(LoggerManager):
    def __init__(
        self,
        repo_config: RepoConfig = None,
        **kwargs,
    ):
        super().__init__(repo_config=repo_config, **kwargs)
        self.s3_config = S3Config.load(config=self.logging_config.destination_config)
        self.s3_client = s3.Client(
            aws_access_key_id=self.s3_config.aws_access_key_id,
            aws_secret_access_key=self.s3_config.aws_secret_access_key,
            bucket=self.s3_config.bucket,
            endpoint_url=self.s3_config.endpoint_url,
        )

    def create_log_filepath_dir(self, path):
        pass

    def delete_old_logs(self):
        pass

    def get_log_filepath_prefix(self):
        return '{}/{}/{}/{}/{}'.format(
            self.s3_config.prefix,
            self.repo_config.repo_name,
            'pipelines',
            self.pipeline_uuid,
            self.partition,
        )

    def get_logs(self):
        s3_object_key = self.get_log_filepath()
        try:
            s3_object = self.s3_client.read(s3_object_key).decode('UTF-8')
        except ClientError:
            s3_object = ''

        return dict(
            name=s3_object_key.split('/')[-1],
            path=s3_object_key,
            content=s3_object,
        )

    async def get_logs_async(self):
        """
        TODO: Implement this method
        """
        return self.get_logs()

    def upload_logs(self, key: str, logs: str):
        self.s3_client.upload(key, logs)
