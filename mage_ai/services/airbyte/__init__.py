from mage_ai.services.airbyte.client import AirbyteClient
from mage_ai.services.airbyte.config import AirbyteConfig
from mage_ai.services.airbyte.constants import (
    CONNECTION_STATUS_ACTIVE,
    CONNECTION_STATUS_DEPRECATED,
    CONNECTION_STATUS_INACTIVE,
    JOB_STATUS_FAILED,
    JOB_STATUS_PENDING,
    JOB_STATUS_SUCCEEDED,
)
from mage_ai.services.airbyte.exceptions import (
    ConnectionDeprecated,
    ConnectionInactive,
    SyncJobFailed,
)
from mage_ai.services.airbyte.server import AirbyteServer
from mage_ai.utils.logger import Logger
from time import sleep
from typing import Dict


class Airbyte():
    def __init__(
        self,
        logger: Logger = None,
        **kwargs,
    ):
        self.logger = logger or Logger(caller='Airbyte', log_to_stdout=True)
        self.server = AirbyteServer(AirbyteConfig(**kwargs))

    def run_sync(self, connection_id: str, poll_interval: int = 10, timeout: int = 5) -> Dict:
        self.logger.info('Run sync started.')

        with self.server.get_client(logger=self.logger, timeout=timeout) as client:
            connection_status = client.get_connection_status(connection_id)

            if CONNECTION_STATUS_ACTIVE == connection_status:
                job = self.__run_sync(client, connection_id, poll_interval=poll_interval)

                return dict(
                    connection_id=connection_id,
                    connection_status=connection_status,
                    job=job,
                )
            elif CONNECTION_STATUS_INACTIVE == connection_status:
                msg = f'Connection: {connection_id} is inactive.'
                self.logger.error(msg)
                raise ConnectionInactive(msg)
            elif CONNECTION_STATUS_DEPRECATED == connection_status:
                msg = f'Connection {connection_id} is deprecated.'
                self.logger.error(msg)
                raise ConnectionDeprecated(msg)

    def __run_sync(
        self,
        client: AirbyteClient,
        connection_id: str,
        poll_interval: int = 10,
    ) -> Dict:
        """
        Arguments:
            poll_interval: How many seconds in between each job status check.
        """

        job = client.run_sync(connection_id)
        job_id = job['id']

        status = JOB_STATUS_PENDING
        while status not in [JOB_STATUS_FAILED, JOB_STATUS_SUCCEEDED]:
            job = client.get_job_status(job_id)
            status = job['status']

            if JOB_STATUS_SUCCEEDED == status:
                self.logger.info(f'Job {job_id} succeeded.')
            elif JOB_STATUS_FAILED == status:
                msg = f'Job {job_id} failed.'
                self.logger.error(msg)
                raise SyncJobFailed(msg)
            else:
                self.logger.info(f'Job {job_id} status: {status}.')
                sleep(poll_interval)

        return job
