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
