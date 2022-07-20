from contextlib import contextmanager
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


class VerboseFunctionExec:
    def __init__(
        self,
        message: str,
        log_func: Callable[[str], None] = None,
        prefix: str = '',
        verbose: bool = True,
    ):
        self.message = message
        self.verbose = verbose
        self.prefix = prefix
        self.log_func = log_func

    def __enter__(self):
        if self.verbose:
            enter_message = f'{self.prefix} {self.message}...'
            if self.log_func is None:
                print_kwargs=dict()
                if self.prefix is None or len(self.prefix) == 0:
                    print_kwargs['end'] = ''
                print(enter_message, **print_kwargs)
            else:
                self.log_func(enter_message)

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.verbose:
            log_func = self.log_func or print
            if exc_type is None:
                log_func(f'{self.prefix} DONE')
            else:
                log_func(f'{self.prefix} FAILED')


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
