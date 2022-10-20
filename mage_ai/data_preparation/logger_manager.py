from mage_ai.services.aws.s3 import s3
from mage_ai.data_preparation.logging.s3.config import S3Config
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_path
from mage_ai.data_preparation.models.constants import LOGS_DIR
import atexit
import io
import logging
import os
import sys

        # print('writing to s3...')
        # with open(log_filepath, 'rb') as file:
        #     s3_client.upload_object(f'{prefix}/{log_filepath}', file)
    

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

        self.logging_config = repo_config.logging_config if repo_config else dict()

        self.log_filepath = self.get_log_filepath(
            repo_path=self.repo_path,
            logs_dir=self.logs_dir,
            pipeline_uuid=self.pipeline_uuid,
            block_uuid=self.block_uuid,
            partition=self.partition,
            create_dir=True,
        )

        logger_name_parts = [self.pipeline_uuid]
        if self.partition is not None:
            logger_name_parts.append(self.partition)
        if self.block_uuid is not None:
            logger_name_parts.append(self.block_uuid)
        self.logger_name = '/'.join(logger_name_parts)

        self.logger = logging.getLogger(self.logger_name)

        self.logger.setLevel(logging.getLevelName(self.logging_config.get('level', 'INFO')))

        self.string_io = None
        if self.logger.hasHandlers():
            if self.logging_config:
                self.string_io = self.get_stream_io()
            else:
                formatter = logging.Formatter(
                    '%(asctime)s %(message)s',
                    '%Y-%m-%dT%H:%M:%S',
                )

                file_handler = logging.FileHandler(self.log_filepath)
                file_handler.setLevel(logging.INFO)
                file_handler.setFormatter(formatter)

                self.logger.addHandler(file_handler)

    def get_stream_io(self):
        logging_type = self.logging_config.get('type')
        if logging_type == 's3':
            string_io = io.StringIO()
            handler = logging.StreamHandler(string_io)
            self.logger.addHandler(handler)

            return string_io

        return None

    def get_logger(self):
        return self.logger

    def output_logs_to_destination(self):
        logging_type = self.logging_config.get('type')
        if logging_type == 's3':
            s3_config = S3Config.load(config=self.logging_config.get('config'))
            s3_client = s3.Client(bucket=s3_config.bucket)

            prefix = s3_config.prefix

            print('writing to s3...')
            s3_client.upload(f'{prefix}/{self.log_filepath}', self.string_io.getvalue())


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
