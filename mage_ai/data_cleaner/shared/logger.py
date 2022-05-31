import time


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
            print(f'[time] metric: {self.metric}, value: {dt}ms, tags: {self.tags}')
