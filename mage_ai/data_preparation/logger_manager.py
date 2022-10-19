from mage_ai.services.aws.s3 import s3
from mage_ai.data_preparation.logging.s3.config import S3Config
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_path
from mage_ai.data_preparation.models.constants import LOGS_DIR
import atexit
import io
import logging
import os
import sys

def test(logging_config, logger: logging.Logger, log_filepath):
    logging_type = logging_config.get('type')
    if logging_type == 's3':
        s3_config = S3Config.load(logging_config.get('config'))
        prefix = s3_config.prefix
        s3_client = s3.Client(s3_config.bucket)

        string_io = io.StringIO()
        handler = logging.StreamHandler(string_io)
        logger.addHandler(handler)

        atexit.register(
            s3_client.upload,
            object_key=f'{prefix}/{log_filepath}',
            content=string_io.getvalue()
        )
    

class LoggerManager:
    @classmethod
    def get_logger(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
        repo_config: RepoConfig = None,
    ):
        log_filepath = self.get_log_filepath(
            repo_path=repo_path,
            logs_dir=logs_dir,
            pipeline_uuid=pipeline_uuid,
            block_uuid=block_uuid,
            partition=partition,
            create_dir=True,
        )

        logger_name_parts = [pipeline_uuid]
        if partition is not None:
            logger_name_parts.append(partition)
        if block_uuid is not None:
            logger_name_parts.append(block_uuid)
        logger_name = '/'.join(logger_name_parts)

        logger = logging.getLogger(logger_name)

        if logger.handlers:
            # if repo_config is not None and repo_config.logging_config:
            #     test(repo_config.logging_config, logger, log_filepath)
            # else:
            formatter = logging.Formatter(
                '%(asctime)s %(message)s',
                '%Y-%m-%dT%H:%M:%S',
            )

            file_handler = logging.FileHandler(log_filepath)
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(formatter)

            logger.addHandler(file_handler)
        return logger

    @classmethod
    def get_log_filepath(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
        create_dir: bool = False,
    ):
        repo_path = repo_path or get_repo_path()
        logs_dir = logs_dir or repo_path

        if pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        logs_dir_path = os.path.join(
            logs_dir,
            'pipelines',
            pipeline_uuid,
            LOGS_DIR,
            partition or '',
        )

        if create_dir and not os.path.exists(logs_dir_path):
            os.makedirs(logs_dir_path)

        if block_uuid is None:
            log_filepath = os.path.join(logs_dir_path, 'pipeline.log')
        else:
            log_filepath = os.path.join(logs_dir_path, f'{block_uuid}.log')
        return log_filepath


class StreamToLogger(object):
    """
    Fake file-like stream object that redirects writes to a logger instance.
    """
    def __init__(self, logger, log_level=logging.INFO):
        self.logger = logger
        self.log_level = log_level
        self.linebuf = ''
        self.terminal = sys.stdout

    def __getattr__(self, attr):
        return getattr(self.terminal, attr)

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            self.logger.log(self.log_level, line.rstrip())

    def flush(self):
        pass
