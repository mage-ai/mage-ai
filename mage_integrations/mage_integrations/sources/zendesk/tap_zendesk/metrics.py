import logging
from statistics import mean
from collections import defaultdict
from datetime import datetime
import singer

# Defines the window (in seconds) over which we will collect raw metrics.
# After this much time has elapsed we'll capture a compressed datapoint
# and log the current results.
capture_rate = 300              # 5 minutes of seconds

metrics_data = {
    # The utc datetime that the most recent window of caputure started on
    'window_start_time': None,
    # This will be a dict of metric => number of datapoints captured since
    # last aggregation
    'aggregate_rates': defaultdict(list),
    # This will be a dict of metric => [capture_window_datapoint1, …,
    # capture_window_datapointn]
    'window_counts': defaultdict(int)
}

LOGGER = singer.get_logger()
LOGGER.setLevel(logging.DEBUG)

def _seconds_since_datetime(dt):
    "Returns the number of seconds since DT"
    return (datetime.utcnow() - dt).seconds

def _log_aggregate_rates(current_capture_rate, aggregate_rates):
    """Logs the aggregate rates"""
    if not list(aggregate_rates.items()):
        LOGGER.info("No zendesk metrics were captured")
    else:
        for metric, value in aggregate_rates.items():
            LOGGER.info("Synced average of %s %ss per %s seconds",
                        mean(value),
                        metric,
                        current_capture_rate)
            LOGGER.info("Synced minimum of %s %ss per %s seconds",
                        min(value),
                        metric,
                        current_capture_rate)
            LOGGER.info("Synced max of %s %ss per %s seconds",
                        max(value),
                        metric,
                        current_capture_rate)
            LOGGER.info("Synced total of %s %ss in %s seconds",
                        sum(value),
                        metric,
                        # Slightly idealized view of how long we've been
                        # capturing metrics for.
                        current_capture_rate * len(value))


def _aggregate_rates(current_capture_rate, current_metrics_data):
    """Captures the aggregate rates, resets the capture window, and logs the
    new aggregate rates"""
    LOGGER.debug(
        "Computing aggregate metrics over the previous %d seconds",
        current_capture_rate)
    window_counts = current_metrics_data['window_counts']
    aggregate_rates = current_metrics_data['aggregate_rates']
    for metric in list(window_counts.keys()):
        aggregate_rates[metric] += [window_counts.pop(metric)]
    current_metrics_data['window_start_time'] = datetime.utcnow()
    _log_aggregate_rates(current_capture_rate, current_metrics_data['aggregate_rates'])

def _maybe_aggregate_rates(current_capture_rate, current_metrics_data):
    """Takes metrics_data and aggregates it into the current aggregated rates
    if enough time has passed. If an aggregation happens it the new
    aggregate values are logged.

    """
    if current_capture_rate <= _seconds_since_datetime(
            current_metrics_data['window_start_time']):
        _aggregate_rates(current_capture_rate, current_metrics_data)

def _capture_raw(current_metrics_data, metric):
    """Adds one to METRIC in WINDOW_COUNTS defaultdict"""
    current_metrics_data['window_counts'][metric] += 1
    LOGGER.debug('Raw count for metric %s is %d',
                 metric,
                 current_metrics_data['window_counts'][metric])

def capture(metric):
    # Start the metrics window timer if this is the first time capture has
    # been called
    if not metrics_data['window_start_time']:
        metrics_data['window_start_time'] = datetime.utcnow()
        LOGGER.info('Starting metrics capture at %s',
                    datetime.strftime(metrics_data['window_start_time'], '%Y-%m-%dT%H:%M:%SZ'))

    _capture_raw(metrics_data, metric)
    _maybe_aggregate_rates(capture_rate, metrics_data)

def log_aggregate_rates():
    """Forces a log of the aggregate rates for the internal datastructures"""
    _aggregate_rates(capture_rate, metrics_data)
