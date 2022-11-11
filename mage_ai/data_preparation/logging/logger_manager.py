from mage_ai.data_preparation.logging import LoggingConfig
from mage_ai.data_preparation.models.constants import LOGS_DIR
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.shared.array import find
import io
import logging
import os


class LoggerManager:
    def __init__(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
        repo_config: RepoConfig = None,
    ):
        self.repo_path = repo_path
        self.logs_dir = logs_dir
        self.pipeline_uuid = pipeline_uuid
        self.block_uuid = block_uuid
        self.partition = partition

        self.repo_config = repo_config or get_repo_config()
        logging_config = self.repo_config.logging_config if self.repo_config else dict()
        self.logging_config = LoggingConfig.load(config=logging_config)

        logger_name_parts = [self.pipeline_uuid]
        if self.partition is not None:
            logger_name_parts.append(self.partition)
        if self.block_uuid is not None:
            logger_name_parts.append(self.block_uuid)
        logger_name = '/'.join(logger_name_parts)

        self.logger = logging.getLogger(logger_name)

        self.log_level = logging.getLevelName(self.logging_config.level)
        self.logger.setLevel(self.log_level)

        self.formatter = logging.Formatter(
            '%(asctime)s %(message)s',
            '%Y-%m-%dT%H:%M:%S',
        )
        self.stream = None
        if not self.logger.handlers:
            if self.logging_config.destination_config:
                handler = self.create_stream_handler()
            else:
                log_filepath = self.get_log_filepath(create_dir=True)
                handler = logging.FileHandler(log_filepath)

            handler.setLevel(self.log_level)
            handler.setFormatter(self.formatter)
            self.logger.addHandler(handler)
        else:
            if self.logging_config.destination_config:
                stream_handler = \
                    find(lambda hr: hr.__class__ == logging.StreamHandler, self.logger.handlers)
                if stream_handler:
                    self.stream = stream_handler.stream

    def create_stream_handler(self):
        self.stream = io.StringIO()
        return logging.StreamHandler(self.stream)

    def output_logs_to_destination(self):
        pass

    def create_log_filepath_dir(self, path):
        if not os.path.exists(path):
            os.makedirs(path)

    def get_log_filepath_prefix(self):
        logs_dir = self.logs_dir or self.repo_config.variables_dir

        return os.path.join(
            logs_dir,
            'pipelines',
            self.pipeline_uuid,
            LOGS_DIR,
            self.partition or '',
        )

    def get_log_filepath(self, create_dir: bool = False):
        if self.pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        prefix = self.get_log_filepath_prefix()

        if create_dir:
            self.create_log_filepath_dir(prefix)

        if self.block_uuid is None:
            log_filepath = os.path.join(prefix, 'pipeline.log')
        else:
            log_filepath = os.path.join(prefix, f'{self.block_uuid}.log')
        return log_filepath

    def get_logs(self):
        file = File.from_path(self.get_log_filepath())
        return file.to_dict(include_content=True)
