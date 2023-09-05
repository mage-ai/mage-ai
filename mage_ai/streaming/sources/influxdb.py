import math
import time
from dataclasses import dataclass
from typing import Callable, Dict

from influxdb_client import InfluxDBClient, QueryApi
from influxdb_client.client.flux_table import TableList

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource


class InfluxDbSourceTimer:
    def __init__(self, every_n_seconds=1):
        """
        Timer class wakes every n seconds and returns last and current wakeup time
        :param every_n_seconds: wakeup every n seconds
        """
        self.next_update_time_s = math.floor(time.time())
        self.every = max(1, int(every_n_seconds))

    def wait(self):
        current_time = time.time()
        current_update_time_s = math.floor(current_time)
        if current_update_time_s == self.next_update_time_s:
            print('Timer doing update')
            self.next_update_time_s = self.next_update_time_s + self.every
            time.sleep(self.next_update_time_s - current_time)
        elif current_update_time_s < self.next_update_time_s:
            print('Timer skipping update')
            time.sleep(self.next_update_time_s - current_time)
        else:  # current_update_time > self.next_update_time
            print(f'Timer missed an update')
            self.next_update_time_s = current_update_time_s
        return current_update_time_s, self.next_update_time_s

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
    timeout_ms: int = DEFAULT_TIMEOUT_MS
    time_delay: str = '-5m'


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
            timeout_ms = DEFAULT_TIMEOUT_MS

        # Initialize timer
        self.timer = InfluxDbSourceTimer(every_n_seconds=1e-3 * timeout_ms)
        self.time_delay = self.config.time_delay

        self.query_api: QueryApi = self.client.query_api()
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        self._print('Start consuming messages.')
        while True:
            last_time, current_time = self.timer.wait()
            ms_to_ns = lambda ms: 1_000_000_000 * ms
            # experimental.addDuration will be removed, use date.add instead
            query = (
                f'import "experimental" '
                f'from(bucket:"{self.config.bucket}") '
                f'|> range(start: experimental.addDuration(d: {self.time_delay}, to: time(v: {ms_to_ns(last_time)})), '
                f'stop: experimental.addDuration(d: {self.time_delay}, to: time(v: {ms_to_ns(current_time)})))'
            )
            self._print(query)
            tables: TableList = self.query_api.query(query)
            for table in tables:
                for i, record in enumerate(table.records):
                    message = {
                        'data': {record.get_field(): record.get_value()},
                        'metadata': {
                            'time': int(1e3 * record.get_time().timestamp()),
                            'tags': {
                                k: v
                                for k, v in record.values.items()
                                if not k.startswith('_')
                                and not k in ['table', "result"]
                            },
                        },
                    }
                    if i == 0:
                        self._print(message)
                    handler(message)

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        while True:
            last_time, current_time = self.timer.wait()
            ms_to_ns = lambda ms: 1_000_000_000 * ms
            # experimental.addDuration will be removed, use date.add instead
            query = (
                f'import "experimental" '
                f'from(bucket:"{self.config.bucket}") '
                f'|> range(start: experimental.addDuration(d: {self.time_delay}, to: time(v: {ms_to_ns(last_time)})), '
                f'stop: experimental.addDuration(d: {self.time_delay}, to: time(v: {ms_to_ns(current_time)})))'
            )
            tables: TableList = self.query_api.query(query)
            messages = []
            for table in tables:
                for i, record in enumerate(table.records):
                    message = {
                        'data': {record.get_field(): record.get_value()},
                        'metadata': {
                            'time': int(1e3 * record.get_time().timestamp()),
                            'tags': {
                                k: v
                                for k, v in record.values.items()
                                if not k.startswith('_')
                                and not k in ['table', "result"]
                            },
                        },
                    }
                    if i == 0:
                        self._print(message)
                    messages.append(message)

            def batches(iterable, batch_size):
                for i in range(0, len(iterable), batch_size):
                    yield iterable[i : min(i + batch_size, len(iterable))]

            for message_batch in batches(messages, batch_size):
                handler(message_batch)

    def test_connection(self):
        return self.client.ping()
