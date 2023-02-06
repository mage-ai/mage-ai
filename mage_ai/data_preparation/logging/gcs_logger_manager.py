from dataclasses import dataclass
from google.cloud import storage
from google.oauth2 import service_account
from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.shared.config import BaseConfig


@dataclass
class GCSConfig(BaseConfig):
    path_to_credentials: str
    bucket: str
    prefix: str


class GCSLoggerManager(LoggerManager):
    def __init__(
        self,
        repo_config: RepoConfig = None,
        **kwargs,
    ):
        super().__init__(repo_config=repo_config, **kwargs)
        self.gcs_config = GCSConfig.load(config=self.logging_config.destination_config)
        credentials = service_account.Credentials.from_service_account_file(
            self.gcs_config.path_to_credentials
        )
        self.gcs_client = storage.Client(credentials=credentials)

    def output_logs_to_destination(self):
        key = self.get_log_filepath()
        bucket = self.gcs_client.get_bucket(self.gcs_config.bucket)
        blob = bucket.blob(key)
        blob.upload_from_string(self.stream.getvalue())

    def create_log_filepath_dir(self, path):
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
