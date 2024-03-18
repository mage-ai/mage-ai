import json
import logging
import time
from contextlib import contextmanager, redirect_stdout
from enum import Enum
from typing import Callable, List

from mage_ai.settings import SERVER_LOGGING_TEMPLATE
from mage_ai.shared.hash import merge_dict

logger = logging.getLogger(__name__)


class timer(object):
    """
    with timer('metric.metric', tags={ 'key': 'value' }):
        function()
    """

    def __init__(self, metric, tags=None, verbose=True):
        self.metric = metric
        self.start = None
        if tags is None:
            tags = {}
        self.tags = tags
        self.verbose = verbose

    def __enter__(self):
        self.start = time.time()

    def __exit__(self, type, value, traceback):
        # Must convert to milliseconds, see details in
        # https://statsd.readthedocs.io/en/v3.1/timing.html
        dt = int((time.time() - self.start) * 1000)
        if self.verbose:
            logger.debug(
                f'[time] metric: {self.metric}, value: {dt}ms, tags: {self.tags}'
            )


class JSONFormatter(logging.Formatter):
    def __init__(
        self,
        fmt=None,
        datefmt=None,
        style='%',
        additional_json_fields: List[str] = None,
    ):
        super().__init__(fmt, datefmt, style)
        if additional_json_fields is None:
            additional_json_fields = []
        self.additional_json_fields = additional_json_fields

    def usesTime(self):
        return True

    def format(self, record: logging.LogRecord) -> str:
        super().format(record)
        # Baseline fields for all JSON log messages
        log_data = {
            'timestamp': record.asctime,
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line_number': record.lineno,
        }
        # Adds exception information and stack trace to the logging message if it exists
        msg = log_data['message']
        if record.exc_text:
            if msg[-1:] != '\n':
                msg = msg + '\n'
            msg = msg + record.exc_text
        if record.stack_info:
            if msg[-1:] != '\n':
                msg = msg + '\n'
            msg = msg + self.formatStack(record.stack_info)
        record_dict = {
            label: getattr(record, label, None) for label in self.additional_json_fields
        }
        record_dict['message'] = msg
        merged_record = merge_dict(log_data, record_dict)
        return json.dumps(merged_record)


def set_logging_format(logging_format: str = None, level: str = None) -> None:
    if isinstance(logging_format, str):
        logging_format = logging_format.lower()

    root_logger = logging.getLogger()
    if len(root_logger.handlers) > 0:
        root_logger.removeHandler(root_logger.handlers[0])

    handler = logging.StreamHandler()
    if logging_format == 'json':
        handler.setFormatter(JSONFormatter())
        root_logger.addHandler(handler)
    else:
        handler.setFormatter(logging.Formatter(SERVER_LOGGING_TEMPLATE))
        root_logger.addHandler(handler)

    if level:
        try:
            root_logger.setLevel(level.upper())
        except (TypeError, ValueError):
            root_logger.exception('Invalid logging level %s', level)


class LoggingLevel(str, Enum):
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'

    @classmethod
    def is_valid_level(cls, level: str) -> bool:
        return level.upper() in cls.__members__


class VerboseFunctionExec:
    def __init__(
        self,
        message: str,
        prefix: str = '',
        verbose: bool = True,
    ):
        self.message = message
        self.verbose = verbose
        self.prefix = prefix

    def __enter__(self):
        if self.verbose:
            enter_message = f'{self.prefix} {self.message}...'
            print(enter_message, end='')

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.verbose:
            if exc_type is None:
                print(f'{self.prefix} DONE')
            else:
                print(f'{self.prefix} FAILED')


class VerbosePrintHandler:
    def __init__(self, start_msg, verbose=False):
        self.verbose = verbose
        if verbose:
            print(start_msg)
        self.exists_previous_message = False

    @contextmanager
    def print_msg(self, msg):
        if self.verbose:
            if self.exists_previous_message:
                print('\r├─ ')
            print(f'└─ {msg}...', end='')
        yield msg
        if self.verbose:
            print('DONE', end='')
            self.exists_previous_message = True


class BlockFunctionExec:
    def __init__(
        self,
        block_uuid: str,
        message: str,
        build_block_output_stdout: Callable[..., object] = None,
    ):
        self.message = message
        self.build_block_output_stdout = build_block_output_stdout
        self.block_uuid = block_uuid

    def __enter__(self):
        if self.build_block_output_stdout is not None:
            stdout = self.build_block_output_stdout(self.block_uuid)
            with redirect_stdout(stdout):
                print(self.message)

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.build_block_output_stdout is not None:
            stdout = self.build_block_output_stdout(
                self.block_uuid,
                execution_state='idle',
            )
            with redirect_stdout(stdout):
                print('DONE')
