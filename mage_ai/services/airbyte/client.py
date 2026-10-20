from mage_ai.services.airbyte.exceptions import (
    ConnectionNotFound,
    JobNotFound,
    UnhealthyServer,
)
from typing import Dict
import httpx
import logging


class AirbyteClient:
    def __init__(
        self,
        base_url: str = 'http://localhost:8000/api/v1',
        logger: logging.Logger = None,
        password: str = 'password',
        timeout: int = 12,
        username: str = 'airbyte',
    ):
        self.base_url = base_url
        self.logger = logger or logging.getLogger(__name__)
        self.timeout = timeout

        self._client = httpx.Client(
            auth=(username, password),
            base_url=self.base_url,
            timeout=timeout,
        )
        self._closed = False
        self._started = False

    def get_connection_status(self, connection_id: str) -> str:
        try:
            response = self._client.post(
                f'{self.base_url}/connections/get/',
                json=dict(connectionId=connection_id),
            )
            response.raise_for_status()

            return response.json()['status']
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ConnectionNotFound(f'Connection {connection_id} not found.') from e

            raise UnhealthyServer() from e

    def get_health_status(self, client: httpx.Client) -> bool:
        try:
            print(f'{self.base_url}/health/')
            response = self._client.get(f'{self.base_url}/health/')
            response.raise_for_status()
            data = response.json()

            self.logger.debug(f'Health check: {data}')

            key = 'available' if 'available' in data else 'db'
            status = response.json()[key]
            if not status:
                raise UnhealthyServer(f"Airbyte server health: {status}")

            return True
        except httpx.HTTPStatusError as e:
            raise UnhealthyServer() from e

    def get_job_status(self, job_id: str) -> Dict:
        try:
            response = self._client.post(
                f'{self.base_url}/jobs/get/',
                json=dict(id=job_id),
            )
            response.raise_for_status()

            return response.json()['job']
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise JobNotFound(f'Job {job_id} not found.') from e

            raise UnhealthyServer() from e

    def run_sync(self, connection_id: str) -> Dict:
        try:
            response = self._client.post(
                f'{self.base_url}/connections/sync/',
                json=dict(connectionId=connection_id),
            )
            response.raise_for_status()

            return response.json()['job']
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ConnectionNotFound(f'Connection {connection_id} not found.') from e

            raise UnhealthyServer() from e

    def __enter__(self):
        if self._closed:
            raise RuntimeError('Airbyte client cannot be started after it’s been closed.')

        if self._started:
            raise RuntimeError('Airbyte client cannot be started more than once.')

        self._started = True

        self.get_health_status(self._client)

        return self

    def __exit__(self, *exc):
        self._closed = True
        self._client.__exit__()
