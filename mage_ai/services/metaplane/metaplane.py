from datetime import datetime
from mage_ai.services.metaplane.config import Config
from mage_ai.shared.http_client import HttpClient
from typing import Dict, List, Literal, TypedDict, Union
import dateutil.parser
import time


class Connection(TypedDict):
    createdAt: datetime
    id: str
    isEnabled: bool
    name: str
    status: Literal['active', 'deleted']
    updatedAt: datetime


class Monitor(TypedDict):
    createdAt: datetime
    cronTab: str
    id: str
    isEnabled: bool
    type: Literal[
        'cardinality',
        'column_count',
        'custom',
        'duration',
        'freshness',
        'iqr',
        'kurtosis',
        'lower_percentile',
        'max',
        'mean',
        'median',
        'min',
        'monotonicity',
        'nullness',
        'range',
        'row_count',
        'skew',
        'stddev',
        'uniqueness',
        'upper_percentile',
    ]
    updatedAt: datetime


class Monitors(TypedDict):
    data: List[Monitor]


class MonitorStatus(TypedDict):
    createdAt: datetime
    lowerBound: float
    passed: bool
    predicted: float
    result: float
    type: Literal['decimal', 'integer']
    upperBound: float


class Metaplane(HttpClient):
    BASE_URL = 'https://dev.api.metaplane.dev'
    VERSION = 'v1'

    def __init__(self, config: Union[Dict, Config]):
        if type(config) is dict:
            self.config = Config.load(config=config)
        else:
            self.config = config

        self.headers = {
            'Authorization': f'Bearer {self.config.api_token}',
            'Content-Type': 'application/json',
        }

    def process(
        self,
        connection_id: str = None,
        monitor_ids: List[str] = None,
        poll_interval: int = 60,
        raise_on_failure: bool = False,
    ) -> None:
        print('Metaplane process started.')

        if not monitor_ids and connection_id:
            print(f'Fetching monitors for connection ID {connection_id}.')
            monitors = self.monitors(connection_id)['data']
            monitor_ids = [m['id'] for m in monitors]
            time.sleep(10)

        monitors_started = {}
        print(f'Running {len(monitor_ids)} monitor(s).')
        for monitor_id in monitor_ids:
            print(f'Running monitor ID {monitor_id}.')
            now = datetime.utcnow()
            status = self.run_monitors([monitor_id])['status']
            print(f'Monitor ID {monitor_id} ran with status {status}.')
            if 200 == status:
                monitors_started[monitor_id] = now

        monitors_completed = {}
        while len(monitors_completed) < len(monitors_started):
            for monitor_id in monitor_ids:
                print(f'Checking status for monitor ID {monitor_id}.')
                monitor_status = self.monitor_status(monitor_id)

                start_date = monitors_started[monitor_id]
                status_date = dateutil.parser.parse(monitor_status['createdAt'])
                completed = status_date.timestamp() >= start_date.timestamp()
                print(f'Monitor ID {monitor_id} completed: {completed}; started {start_date}, '
                      f'last created {status_date}).')
                if completed:
                    passed = monitor_status['passed']

                    if raise_on_failure and not passed:
                        raise Exception(f'Monitor ID {monitor_id} didn’t pass.')

                    monitors_completed[monitor_id] = passed
                    print(f'Monitor ID {monitor_id} passed: {passed}.')

            if len(monitors_completed) < len(monitors_started):
                time.sleep(poll_interval)

        print('Metaplane process completed.')

    def connections(self, include_deleted: bool = False) -> List[Connection]:
        return self.make_request(
            f'/{self.VERSION}/connections',
            params=dict(includeDeleted=include_deleted),
        )

    def monitors(self, connection_id: str, include_deleted: bool = False) -> Monitors:
        return self.make_request(
            f'/{self.VERSION}/monitors/connection/{connection_id}',
            params=dict(includeDeleted=include_deleted),
        )

    def monitor_status(self, monitor_id: str) -> MonitorStatus:
        return self.make_request(f'/{self.VERSION}/monitors/status/{monitor_id}')

    def run_monitors(self, monitor_ids: List[str]) -> Dict:
        response = self.make_request(f'/{self.VERSION}/monitors/run', method='POST', payload=dict(
            testIds=monitor_ids,
        ))
        return dict(status=response.status_code)
