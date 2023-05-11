from datetime import datetime, timedelta
from mage_ai.data_preparation.logging import LoggingConfig
from mage_ai.data_preparation.models.constants import LOGS_DIR, PIPELINES_FOLDER
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.shared.array import find
import io
import logging
import os
import re

MAX_LOG_FILE_SIZE = 20 * 1024 * 1024


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
            try:
                if self.logging_config.destination_config:
                    handler = self.create_stream_handler()
                else:
                    log_filepath = self.get_log_filepath(create_dir=create_dir)
                    handler = logging.handlers.RotatingFileHandler(
                        log_filepath,
                        backupCount=10,
                        maxBytes=MAX_LOG_FILE_SIZE,
                    )
                    # TODO: Use TimedRotatingFileHandler for streaming pipelines
                    # handler = logging.handlers.TimedRotatingFileHandler(
                    #     log_filepath,
                    #     backupCount=10,
                    #     interval=1,
                    #     when='M',
                    #     utc=True,
                    # )
                    # handler.namer = self.handler_namer
                    # handler.rolloverAt = datetime.now().replace(
                    #     microsecond=0,
                    #     second=0,
                    #     minute=0,
                    # ).timestamp() + 3600

                handler.setLevel(self.log_level)
                handler.setFormatter(self.formatter)
                self.logger.addHandler(handler)
            except FileNotFoundError:
                pass
        else:
            if self.logging_config.destination_config:
                stream_handler = \
                    find(lambda hr: hr.__class__ == logging.StreamHandler, self.logger.handlers)
                if stream_handler:
                    self.stream = stream_handler.stream

    def create_stream_handler(self):
        self.stream = io.StringIO()
        return logging.StreamHandler(self.stream)

    def handler_namer(self, default_name):
        return self.get_log_filepath(create_dir=True, subtract_hour=True)

    def output_logs_to_destination(self):
        pass

    def create_log_filepath_dir(self, path):
        if not os.path.exists(path):
            os.makedirs(path)

    def get_log_filepath_prefix(self, include_date_hour_subpath=False, subtract_hour=False):
        logs_dir = self.logs_dir or self.repo_config.variables_dir
        now_date = datetime.utcnow() \
            if not subtract_hour else datetime.utcnow() - timedelta(hours=1)
        current_date = now_date.strftime('%Y%m%d')
        current_hour = now_date.strftime('%H')

        return os.path.join(
            logs_dir,
            PIPELINES_FOLDER,
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
        log_dir: str,
        filename: str = None,
        depth: int = 1,             # Current traversal folder depth
        start_timestamp: datetime = None,
        end_timestamp: datetime = None,
        write_date_depth: int = 1,  # Depth of folder with format YYYYMMDD
    ):
        """
        Log directory structure:
        - [project_name] (e.g. default_repo)
          → pipelines
              → [pipeline_uuid]
                  → .logs
                    → [pipeline_schedule_id]
                      → [pipeline_run_execution_date]
                        → [YYYYMMDD] (write date, i.e. date log was written)
                          → [HH] (write hour, i.e. hour log was written)
                            → pipeline.log (log file)
                            → [block_uuid].log (log file)

        We recursively scan through all the folders and subfolders to find the
        relevant log files. The "depth" argument is the current traversal level.
        We start at a depth of 1 and increase that depth by 1 for every child
        subfolder we scan through. If the .logs folder is the starting parent
        directory (i.e. the log_dir argument), we would be scanning the
        [pipeline_schedule_id] folders at depth of 1, the [pipeline_run_execution_date]
        folders at depth of 2, the [YYYYMMDD] folders at depth of 3, etc.

        Depending on which parent directory we start traversing from, the
        write date (YYYYMMDD) folder will start at a certain depth (the
        write_date_depth). If we start traversing from the .logs folder, the
        write_date_depth will be 3 because it is 3 levels down. If we start
        traversing from the [pipeline_run_execution_date] folder, the
        write_date_depth will be 1.
        """
        date_depth = write_date_depth   # Depth of YYYYMMDD folder
        hour_depth = date_depth + 1     # Depth of HH folder
        start_date = None
        start_hour = None
        end_date = None
        end_hour = None
        if start_timestamp:
            start_date = int(start_timestamp.strftime('%Y%m%d'))
            start_hour = int(start_timestamp.strftime('%H'))
        if end_timestamp:
            end_date = int(end_timestamp.strftime('%Y%m%d'))
            end_hour = int(end_timestamp.strftime('%H'))

        subfolders_in_range, files_in_range = [], []
        for f in os.scandir(log_dir):
            if f.is_dir():
                # folder_timestamp is the write date or write hour depending on which depth it is
                folder_timestamp = int(os.path.basename(os.path.normpath(f.path))) \
                    if depth >= date_depth else None
                """
                Compare YYYYMMDD and HH folder write dates/hours with start/end
                timestamps to see if we can skip scanning certain folders.
                """
                is_date_depth = depth == date_depth
                is_hour_depth = depth == hour_depth
                write_date = int(
                    os.path.basename(
                        os.path.split(os.path.normpath(f.path))[0],
                    )
                ) if is_hour_depth else None
                is_start_date = write_date == start_date
                is_end_date = write_date == end_date

                if (start_timestamp is None and end_timestamp is None) or \
                        (depth != date_depth and depth != hour_depth):
                    subfolders_in_range.append(f.path)
                elif start_timestamp is not None and end_timestamp is not None:
                    if (is_date_depth and folder_timestamp and start_date and end_date and
                            folder_timestamp >= start_date and
                            folder_timestamp <= end_date) or \
                        (is_hour_depth and not is_start_date and
                            not is_end_date) or \
                        (is_hour_depth and is_start_date and
                            is_end_date and folder_timestamp and start_hour and end_hour and
                            folder_timestamp >= start_hour and
                            folder_timestamp <= end_hour) or \
                        (is_hour_depth and is_start_date and
                            not is_end_date and folder_timestamp and start_hour and
                            folder_timestamp >= start_hour) or \
                        (is_hour_depth and not is_start_date and
                            is_end_date and folder_timestamp and end_hour and
                            folder_timestamp <= end_hour):
                        subfolders_in_range.append(f.path)
                elif start_timestamp is not None and end_timestamp is None:
                    if (is_date_depth and folder_timestamp and start_date
                            and folder_timestamp >= start_date) or \
                        (is_hour_depth and not is_start_date) or \
                        (is_hour_depth and is_start_date and start_hour and
                            folder_timestamp and folder_timestamp >= start_hour):
                        subfolders_in_range.append(f.path)
                elif start_timestamp is None and end_timestamp is not None:
                    if (is_date_depth and folder_timestamp and end_date and
                            folder_timestamp <= end_date) or \
                        (is_hour_depth and not is_end_date) or \
                        (is_hour_depth and is_end_date and folder_timestamp and
                            end_hour and folder_timestamp <= end_hour):
                        subfolders_in_range.append(f.path)
            elif f.is_file():
                fileExtensionRegEx = re.compile(r'^.+\.log(\.[0-9]+)?$')
                if (filename is not None and f.path.split('/')[-1] == filename) or (
                    filename is None and (
                        f.path.endswith('.log') or re.match(fileExtensionRegEx, f.path)
                    )
                ):
                    files_in_range.append(f.path)

        for log_dir in list(subfolders_in_range):
            sf, f = self.traverse_logs_dir(
                log_dir,
                filename=filename,
                depth=depth + 1,
                start_timestamp=start_timestamp,
                end_timestamp=end_timestamp,
                write_date_depth=write_date_depth,
            )
            subfolders_in_range.extend(sf)
            files_in_range.extend(f)

        return subfolders_in_range, files_in_range

    def get_log_filepaths(self, **kwargs):
        logs_dir = self.get_log_filepath_prefix()
        if not os.path.exists(logs_dir):
            return []

        """
        Depending on the parent directory where we start traversing down the file tree,
        we need to update the depth of the log write date (i.e. the write_date_depth or
        the YYYYMMDD folder) so we know when to compare the write dates with the time
        range filters.
        """
        write_date_depth = (3 - len(self.partition.split('/'))) if self.partition is not None else 3
        subfolders, filepaths = self.traverse_logs_dir(
            logs_dir,
            filename=self.get_log_filename(),
            write_date_depth=write_date_depth,
            **kwargs,
        )

        return filepaths

    def get_log_filepath(
        self,
        create_dir: bool = False,
        subtract_hour: bool = False,
    ):
        if self.pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        prefix = self.get_log_filepath_prefix(
            include_date_hour_subpath=create_dir,
            subtract_hour=subtract_hour,
        )

        log_filepath = os.path.join(prefix, self.get_log_filename())
        if create_dir:
            self.create_log_filepath_dir(prefix)
        else:
            log_filepaths_without_prefix = [os.path.relpath(filepath, prefix).split('/')
                                            for filepath in self.get_log_filepaths()]

            """
            Example path_parts: ['338', '20230407T181049', '20230401', '18', 'pipeline.log']

            The code below sorts the log files in reverse chronological order using the
            log write date (e.g. '20230401' or path_parts[-3]) and log write hour (e.g. '18'
            or path_parts[-2]).

            If the write date and hour is not available (e.g. path_parts of
            ["338", "20230407T190020", "pipeline.log"]) due to legacy logs not
            keeping track of it, those log files will be sorted last.
            """
            sorted_log_filepaths = sorted(
                log_filepaths_without_prefix,
                key=lambda path_parts: (
                    (int(path_parts[-3]), int(path_parts[-2]))
                    if len(path_parts) > 2 and 'T' not in path_parts[-2] else (0, 0)
                ),
                reverse=True,
            )

            if sorted_log_filepaths:
                log_filepath = os.path.join(
                    prefix,
                    os.path.join(*sorted_log_filepaths[0]),
                )

        return log_filepath

    def get_logs(self):
        log_file_paths = self.get_log_filepaths()
        log_files = File.from_paths(log_file_paths)
        return [file.to_dict(include_content=True) for file in log_files]

    async def get_logs_async(self, filepaths=[], **kwargs):
        log_file_paths = filepaths or self.get_log_filepaths(**kwargs)
        log_files = File.from_paths(log_file_paths)
        return [await file.to_dict_async(include_content=True) for file in log_files]
