from datadog import initialize, api, statsd
from datetime import datetime
import os
import time

options = {
    'api_key': os.getenv('DD_API_KEY'),
    'app_key': os.getenv('DD_APP_KEY'),
}

initialize(**options)


def create_event(title, text, tags={}):
    return api.Event.create(
        title=title,
        text=text,
        tags=tags,
    )


def gauge(metric, value, host='mage', tags={}):
    return api.Metric.send(
        host=host,
        metric=metric,
        points=[
            (datetime.utcnow().timestamp(), value),
        ],
        tags=tags,
        type='gauge',
    )


def increment(metric, tags={}, value=1):
    return create_metrics([
        (metric, value, tags),
    ])


def create_metrics(metrics, host='mage', metric_type='count'):
    # Format of argument
    # metrics = [
    #     ('metric', 'value', 'tags'),
    # ]
    arr = [{
        'host': host,
        'metric': t[0],
        'points': t[1],
        'tags': t[2] if len(t) == 3 else {},
        'type': metric_type,
    } for t in metrics]
    return api.Metric.send(metrics=arr)


def create_metric(metric, value, host='mage', tags={}):
    return api.Metric.send(
        host=host,
        metric=metric,
        points=[
            (datetime.utcnow().timestamp(), value),
        ],
        tags=tags,
        type='count',
    )


def histogram(metric, value, host='mage', tags={}):
    return api.Metric.send(
        host=host,
        metric=metric,
        points=[
            (datetime.utcnow().timestamp(), value),
        ],
        tags=tags,
        type='histogram',
    )


def timing(metric, value, host='mage', tags={}):
    return api.Metric.send(
        host=host,
        metric=metric,
        points=[
            (datetime.utcnow().timestamp(), value),
        ],
        tags=tags,
        type='timer',
    )


class timed_decorator(object):
    """
    @timed_decorator('metric.metric', tags={ 'key': 'value' })
    """
    def __init__(self, metric, tags={}):
        self.metric = metric
        self.tags = tags

    def __call__(self, f):
        def wrapped_f(*args):
            with statsd.timed(self.metric, tags=self.tags):
                return f(*args)
        return wrapped_f


class timer(object):
    """
    with timer('metric.metric', tags={ 'key': 'value' }):
        function()
    """
    def __init__(self, metric, tags={}):
        self.metric = metric
        self.start = None
        self.tags = tags

    def __enter__(self):
        self.start = time.time()

    def __exit__(self, type, value, traceback):
        # Must convert to milliseconds, see details in
        # https://statsd.readthedocs.io/en/v3.1/timing.html
        dt = int((time.time() - self.start) * 1000)
        return timing(self.metric, dt, tags=self.tags)
