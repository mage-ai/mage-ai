from contextlib import contextmanager, redirect_stdout
from enum import Enum
from typing import Callable
import logging
import time

logger = logging.getLogger(__name__)


class timer(object):
    """
    with timer('metric.metric', tags={ 'key': 'value' }):
        function()
    """

    def __init__(self, metric, tags={}, verbose=True):
        self.metric = metric
        self.start = None
        self.tags = tags
        self.verbose = verbose

    def __enter__(self):
        self.start = time.time()

    def __exit__(self, type, value, traceback):
        # Must convert to milliseconds, see details in
        # https://statsd.readthedocs.io/en/v3.1/timing.html
        dt = int((time.time() - self.start) * 1000)
        if self.verbose:
            logger.debug(f'[time] metric: {self.metric}, value: {dt}ms, tags: {self.tags}')


class LoggingLevel(str, Enum):
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'


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
                print(f'\r├─ ')
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
