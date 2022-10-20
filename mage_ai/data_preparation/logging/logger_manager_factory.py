from enum import Enum
from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.logging.s3_logger_manager import S3LoggerManager
from mage_ai.data_preparation.repo_manager import RepoConfig


class LoggerType(Enum):
    DEFAULT = 'file'
    S3 = 's3'

class LoggerManagerFactory:
    @classmethod
    def get_logger_manager(
        self,
        repo_config: RepoConfig = None,
        **kwargs,
    ):
        if repo_config is not None and repo_config.logging_config is not None:
            logger_type = repo_config.logging_config.get('type')
            if logger_type == LoggerType.S3.value:
                return S3LoggerManager(repo_config=repo_config, **kwargs)
        
        return LoggerManager(repo_config=repo_config, **kwargs)
