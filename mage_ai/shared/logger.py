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
    def __init__(self, message, verbose=True):
        self.message = message
        self.verbose = verbose

    def __enter__(self):
        if self.verbose:
            print(f'{self.message}...', end='')

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.verbose:
            if exc_type is None:
                print('DONE')
            else:
                print('FAILED')


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
