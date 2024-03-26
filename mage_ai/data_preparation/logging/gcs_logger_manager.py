from dataclasses import dataclass

from google.cloud import storage
from google.oauth2 import service_account

from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.shared.config import BaseConfig


@dataclass
class GCSConfig(BaseConfig):
    bucket: str
    prefix: str
    path_to_credentials: str = None


class GCSLoggerManager(LoggerManager):
    def __init__(
        self,
        repo_config: RepoConfig = None,
        **kwargs,
    ):
        super().__init__(repo_config=repo_config, **kwargs)
        self.gcs_config = GCSConfig.load(config=self.logging_config.destination_config)
        if self.gcs_config.path_to_credentials:
            credentials = service_account.Credentials.from_service_account_file(
                self.gcs_config.path_to_credentials
            )
        else:
            credentials = None
        self.gcs_client = storage.Client(credentials=credentials)

    def create_log_filepath_dir(self, path):
        pass

    def delete_old_logs(self):
        pass

    def get_log_filepath_prefix(self):
        return '{}/{}/{}/{}/{}'.format(
            self.gcs_config.prefix,
            self.repo_config.repo_name,
            'pipelines',
            self.pipeline_uuid,
            self.partition,
        )

    def get_logs(self):
        object_key = self.get_log_filepath()
        try:
            bucket = self.gcs_client.get_bucket(self.gcs_config.bucket)
            blob = bucket.blob(object_key)
            gcp_object = blob.download_as_string().decode('UTF-8')
        except Exception:
            gcp_object = ''

        return dict(
            name=object_key.split('/')[-1],
            path=object_key,
            content=gcp_object,
        )

    async def get_logs_async(self):
        """
        TODO: Implement this method
        """
        return self.get_logs()

    def upload_logs(self, key: str, logs: str):
        bucket = self.gcs_client.get_bucket(self.gcs_config.bucket)
        blob = bucket.blob(key)
        blob.upload_from_string(logs)
