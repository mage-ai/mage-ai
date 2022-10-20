from mage_ai.services.aws.s3 import s3
from mage_ai.data_preparation.logging.s3.config import S3Config
from mage_ai.data_preparation.models.constants import LOGS_DIR
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_path
import atexit
import io
import logging
import os
import sys
    

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

        self.repo_config = repo_config
        self.logging_config = self.repo_config.logging_config if self.repo_config else dict()

        logger_name_parts = [self.pipeline_uuid]
        if self.partition is not None:
            logger_name_parts.append(self.partition)
        if self.block_uuid is not None:
            logger_name_parts.append(self.block_uuid)
        logger_name = '/'.join(logger_name_parts)

        self.logger = logging.getLogger(logger_name)

        self.logger.setLevel(logging.getLevelName(self.logging_config.get('level', 'INFO')))

        self.string_io = None
        if not self.logger.handlers:
            if self.logging_config:
                self.string_io = self.get_stream_io()
            else:
                formatter = logging.Formatter(
                    '%(asctime)s %(message)s',
                    '%Y-%m-%dT%H:%M:%S',
                )                

                log_filepath = self.get_log_filepath(create_dir=True)
                file_handler = logging.FileHandler(log_filepath)
                file_handler.setLevel(logging.INFO)
                file_handler.setFormatter(formatter)

                self.logger.addHandler(file_handler)

    @property
    def logging_type(self):
        return self.logging_config.get('type')

    def get_stream_io(self):
        if self.logging_type == 's3':
            string_io = io.StringIO()
            handler = logging.StreamHandler(string_io)
            self.logger.addHandler(handler)

            return string_io

        return None

    def get_logger(self):
        return self.logger

    def output_logs_to_destination(self):
        if self.logging_type == 's3':
            s3_config = S3Config.load(config=self.logging_config.get('config'))
            s3_client = s3.Client(bucket=s3_config.bucket)

            key = self.get_log_filepath()
            s3_client.upload(f'{key}', self.string_io.getvalue())

    def get_log_filepath(self, create_dir: bool = False):
        repo_path = self.repo_path or get_repo_path()
        logs_dir = self.logs_dir or repo_path

        if self.pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        prefix = os.path.join(
            logs_dir,
            'pipelines',
            self.pipeline_uuid,
            LOGS_DIR,
            self.partition or '',
        )

        if self.logging_type == 's3':
            s3_config = S3Config.load(config=self.logging_config.get('config'))
            prefix = f'{s3_config.prefix}/{self.pipeline_uuid}/{self.partition}'
        else:
            if create_dir and not os.path.exists(prefix):
                os.makedirs(prefix)

        if self.block_uuid is None:
            log_filepath = os.path.join(prefix, 'pipeline.log')
        else:
            log_filepath = os.path.join(prefix, f'{self.block_uuid}.log')
        return log_filepath

    def get_logs(self):
        if self.logging_type == 's3':
            s3_config = S3Config.load(config=self.logging_config.get('config'))
            s3_client = s3.Client(bucket=s3_config.bucket)
            s3_object_key = self.get_log_filepath()
            print('key:', s3_object_key)
            try:
                s3_object = s3_client.read(s3_object_key).decode('utf-8')
            except:
                s3_object = None

            print('s3_object', s3_object)
            return dict(
                content=s3_object
            )
        else:
            file = File.from_path(self.get_log_filepath())
            return file.to_dict(include_content=True)
        

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
