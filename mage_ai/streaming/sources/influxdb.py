import datetime
import time
from dataclasses import dataclass
from typing import Callable, Tuple

from influxdb_client import InfluxDBClient, QueryApi
from influxdb_client.client.flux_table import TableList

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE
from mage_ai.streaming.sources.base import BaseSource


def build_query(
    bucket: str,
    start_time: float,
    stop_time: float,
    time_delay: str,
    filter_fn: str,
) -> str:
    """Build flux query for data in the range (start_time - time_delay, stop_time - time_delay)

    Args:
        bucket (str): Bucket to query from.
        stop_time (float): Time range stop timestamp.
        time_delay (str): Flux duration.
            E.g. 3d12h4m25s for 3 days, 12 hours, 4 minutes, and 25 seconds.
            Documentation: https://docs.influxdata.com/flux/v0.x/data-types/basic/duration/.
        filter_fn (str): Flux filter function.
            E.g. r._measurement == "cpu" and r._field == "usage_system".
            Documentation: https://docs.influxdata.com/flux/v0.x/stdlib/universe/filter/.

    Returns:
        str: Flux query.
    """

    start_time_ns = int(1e9 * start_time)
    stop_time_ns = int(1e9 * stop_time)
    # experimental.addDuration will be removed in the future, use date.add instead
    # currently experimental.addDuration is better supported than date.add
    query = (
        'import "experimental" '
        f'from(bucket:"{bucket}") '
        '|> range('
        f'start: experimental.addDuration(d: -{time_delay}, to: time(v: {start_time_ns})), '
        f'stop: experimental.addDuration(d: -{time_delay}, to: time(v: {stop_time_ns}))'
        ')'
        f'|> filter(fn: (r) => {filter_fn})'
    )
    return query


def batches(iterable, batch_size):
    for i in range(0, len(iterable), batch_size):
        yield iterable[i: min(i + batch_size, len(iterable))]


class InfluxDbSourceTimer:
    """Timer class wakes every update_interval_s."""

    def __init__(self, update_interval_s: float = 1.0, print_intervals=False):
        """Initialize InfluxDbSourceTime.

        Args:
            update_interval_s (float, optional): Time wait() blocks before returning.
                Defaults to 1.0 second.
            print_intervals (bool, optional): If True the time intervals are printed.
                Defaults to False.
        """
        self.next_time_s = None
        self.update_interval_s = update_interval_s
        self.print_intervals = print_intervals

    def wait(self) -> Tuple[float, float]:
        """Wait one interval before returning.

        Returns:
            Tuple[float, float]: Last and current timestamp.
        """
        last_time_s = self.next_time_s
        current_time_s = time.time()
        if not self.next_time_s:
            last_time_s = current_time_s
            self.next_time_s = current_time_s + self.update_interval_s
        else:
            missed_updates = (
                current_time_s - self.next_time_s
            ) // self.update_interval_s
            if missed_updates < 1:
                self.next_time_s += self.update_interval_s
            else:
                self._print(
                    f'Missed {int(missed_updates)} update(s). Please increase timeout_ms.'
                )
                self.next_time_s += self.update_interval_s * (missed_updates + 1)

        if self.print_intervals:
            last_time = datetime.datetime.fromtimestamp(last_time_s)
            next_time = datetime.datetime.fromtimestamp(self.next_time_s)
            self._print(f'Interval: {last_time:%H:%M:%S.%f} -> {next_time:%H:%M:%S.%f}')

        time.sleep(self.next_time_s - current_time_s)
        return last_time_s, self.next_time_s

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')


@dataclass
class InfluxDbConfig(BaseConfig):
    url: str
    token: str
    org: str
    bucket: str = 'data'
    measurement: str = 'default'
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = 1000
    time_delay: str = '5m'
    print_intervals: bool = False
    filter_fn: str = 'true'


class InfluxDbSource(BaseSource):
    config_class = InfluxDbConfig

    def init_client(self):
        self._print('Start initializing consumer.')
        # Initialize influxdb client and query_api
        self.client = InfluxDBClient(
            url=self.config.url,
            token=self.config.token,
            org=self.config.org,
        )
        if self.config.timeout_ms > 0:
            timeout_ms = self.config.timeout_ms
        else:
            timeout_ms = 1_000

        # Initialize timer
        self.timer = InfluxDbSourceTimer(
            update_interval_s=1e-3 * timeout_ms,
            print_intervals=self.config.print_intervals,
        )
        self.time_delay = self.config.time_delay

        self.query_api: QueryApi = self.client.query_api()
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        self._print('Start consuming messages.')
        while True:
            last_time, current_time = self.timer.wait()
            query = build_query(
                self.config.bucket,
                last_time,
                current_time,
                self.time_delay,
                self.config.filter_fn,
            )
            tables: TableList = self.query_api.query(query)
            for i, table in enumerate(tables):
                for j, record in enumerate(table.records):
                    message = {
                        'data': {record.get_field(): record.get_value()},
                        'metadata': {
                            'time': int(1e3 * record.get_time().timestamp()),
                            'measurement': record['_measurement'],
                            'tags': {
                                k: v
                                for k, v in record.values.items()
                                if not k.startswith('_')
                                and k not in ['table', 'result']
                            },  # remove influxdb internal fields
                        },
                    }
                    if i == 0 and j == 0:
                        no_records = sum([len(t.records) for t in tables])
                        self._print(f'Received {no_records} records. Sample: {message}')
                    handler(message)

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        while True:
            last_time, current_time = self.timer.wait()
            query = build_query(
                self.config.bucket,
                last_time,
                current_time,
                self.time_delay,
                self.config.filter_fn,
            )
            tables: TableList = self.query_api.query(query)
            messages = []
            for i, table in enumerate(tables):
                for j, record in enumerate(table.records):
                    message = {
                        'data': {record.get_field(): record.get_value()},
                        'metadata': {
                            'time': int(1e3 * record.get_time().timestamp()),
                            'measurement': record['_measurement'],
                            'tags': {
                                k: v
                                for k, v in record.values.items()
                                if not k.startswith('_')
                                and k not in ['table', 'result']
                            },  # remove influxdb internal fields
                        },
                    }
                    if i == 0 and j == 0:
                        no_records = sum([len(t.records) for t in tables])
                        self._print(f'Received {no_records} records. Sample: {message}')
                    messages.append(message)

            for message_batch in batches(messages, batch_size):
                handler(message_batch)

    def test_connection(self):
        return self.client.ping()
