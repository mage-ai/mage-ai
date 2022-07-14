from contextlib import contextmanager
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
    def __init__(self, message, verbose=True, prefix='', print_func=print):
        self.message = message
        self.verbose = verbose
        self.prefix = prefix
        self.print_func = print_func

    def __enter__(self):
        if self.verbose:
            self.print_func(f'{self.prefix} {self.message}...')

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.verbose:
            if exc_type is None:
                self.print_func(f'{self.prefix} DONE')
            else:
                self.print_func(f'{self.prefix} FAILED')


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
