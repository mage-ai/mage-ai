from datetime import datetime
from mage_ai.data_preparation.logging import LoggingConfig
from mage_ai.data_preparation.models.constants import LOGS_DIR
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.shared.array import find
import io
import logging
import os

MAX_LOG_FILE_SIZE = 5 * 1024 * 1024


class LoggerManager:
    def __init__(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
        repo_config: RepoConfig = None,
        create_dir: bool = True,
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
                log_filepath = self.get_log_filepath(create_dir=create_dir)
                handler = logging.handlers.RotatingFileHandler(
                    log_filepath,
                    backupCount=10,
                    maxBytes=MAX_LOG_FILE_SIZE,
                )

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

    def get_log_filepath_prefix(self, include_date_hour_subpath=False):
        logs_dir = self.logs_dir or self.repo_config.variables_dir
        current_date = datetime.utcnow().strftime('%Y%m%d')
        current_hour = datetime.utcnow().strftime('%H')

        return os.path.join(
            logs_dir,
            'pipelines',
            self.pipeline_uuid,
            LOGS_DIR,
            self.partition or '',
            current_date if include_date_hour_subpath else '',
            current_hour if include_date_hour_subpath else '',
        )

    def get_log_filename(self):
        filename = 'pipeline.log'
        if self.block_uuid is not None:
            filename = f'{self.block_uuid}.log'

        return filename

    def traverse_logs_dir(
        self,
        dir: str,
        filename: str,
        depth: int = 1,
        start_timestamp: datetime = None,
        end_timestamp: datetime = None
    ):
        start_date = None
        start_hour = None
        end_date = None
        end_hour = None
        if start_timestamp:
            start_date = start_timestamp.strftime('%Y%m%d')
            start_hour = start_timestamp.strftime('%H')
        if end_timestamp:
            end_date = end_timestamp.strftime('%Y%m%d')
            end_hour = end_timestamp.strftime('%H')

        subfolders_in_range, files_in_range = [], []
        for f in os.scandir(dir):
            if f.is_dir():
                folder_timestamp = int(f.path.split('/')[-1])
                write_date = int(f.path.split('/')[-2]) if depth == 2 else None
                if start_timestamp is None and end_timestamp is None:
                    subfolders_in_range.append(f.path)
                elif start_timestamp is not None and end_timestamp is not None:
                    if (depth == 1 and folder_timestamp >= int(start_date) and
                            folder_timestamp <= int(end_date)) or \
                        (depth == 2 and write_date != int(start_date) and
                            write_date != int(end_date)) or \
                        (depth == 2 and write_date == int(start_date) and
                            write_date == int(end_date) and
                            folder_timestamp >= int(start_hour) and
                            folder_timestamp <= int(end_hour)) or \
                        (depth == 2 and write_date == int(start_date) and
                            write_date != int(end_date) and
                            folder_timestamp >= int(start_hour)) or \
                        (depth == 2 and write_date != int(start_date) and
                            write_date == int(end_date) and
                            folder_timestamp <= int(end_hour)):
                        subfolders_in_range.append(f.path)
                elif start_timestamp is not None and end_timestamp is None:
                    if (depth == 1 and folder_timestamp >= int(start_date)) or \
                        (depth == 2 and write_date != int(start_date)) or \
                        (depth == 2 and write_date == int(start_date) and
                            folder_timestamp >= int(start_hour)):
                        subfolders_in_range.append(f.path)
                elif start_timestamp is None and end_timestamp is not None:
                    if (depth == 1 and folder_timestamp <= int(end_date)) or \
                        (depth == 2 and write_date != int(end_date)) or \
                        (depth == 2 and write_date == int(end_date) and
                            folder_timestamp <= int(end_hour)):
                        subfolders_in_range.append(f.path)
            elif f.is_file() and f.path.split('/')[-1] == filename:
                files_in_range.append(f.path)

        for dir in list(subfolders_in_range):
            sf, f = self.traverse_logs_dir(
                dir,
                filename,
                depth=depth + 1,
                start_timestamp=start_timestamp,
                end_timestamp=end_timestamp,
            )
            subfolders_in_range.extend(sf)
            files_in_range.extend(f)

        return subfolders_in_range, files_in_range

    def get_log_filepaths(self, **kwargs):
        logs_dir = self.get_log_filepath_prefix()
        subfolders, filepaths = self.traverse_logs_dir(
            logs_dir,
            self.get_log_filename(),
            **kwargs,
        )

        return filepaths

    def get_log_filepath(self, create_dir: bool = False):
        if self.pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        prefix = self.get_log_filepath_prefix(
            include_date_hour_subpath=True if create_dir else False,
        )

        log_filepath = os.path.join(prefix, self.get_log_filename())
        if create_dir:
            self.create_log_filepath_dir(prefix)
        else:
            log_filepaths_without_prefix = [filepath[len(prefix):].split('/')
                                            for filepath in self.get_log_filepaths()]
            sorted_log_filepaths = sorted(
                log_filepaths_without_prefix,
                key=lambda path_parts: (
                    (int(path_parts[0]), int(path_parts[1]))
                    if len(path_parts) > 2 else (0, 0)
                ),
                reverse=True,
            )
            if sorted_log_filepaths:
                log_filepath = os.path.join(prefix, '/'.join(sorted_log_filepaths[0]))

        return log_filepath

    def get_logs(self):
        log_file_paths = self.get_log_filepaths()
        log_files = File.from_paths(log_file_paths)
        return [file.to_dict(include_content=True) for file in log_files]

    async def get_logs_async(self, **kwargs):
        log_file_paths = self.get_log_filepaths(**kwargs)
        log_files = File.from_paths(log_file_paths)
        return [await file.to_dict_async(include_content=True) for file in log_files]
