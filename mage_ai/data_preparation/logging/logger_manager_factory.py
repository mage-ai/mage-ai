from mage_ai.data_preparation.logging import LoggerType
from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.repo_manager import RepoConfig


class LoggerManagerFactory:
    @classmethod
    def get_logger_manager(
        self,
        repo_config: RepoConfig = None,
        **kwargs,
    ):
        if repo_config is not None and repo_config.logging_config is not None:
            logger_type = repo_config.logging_config.get('type')
            if logger_type == LoggerType.S3:
                from mage_ai.data_preparation.logging.s3_logger_manager import S3LoggerManager
                return S3LoggerManager(repo_config=repo_config, **kwargs)
            elif logger_type == LoggerType.GCS:
                from mage_ai.data_preparation.logging.gcs_logger_manager import GCSLoggerManager
                return GCSLoggerManager(repo_config=repo_config, **kwargs)

        return LoggerManager(repo_config=repo_config, **kwargs)
