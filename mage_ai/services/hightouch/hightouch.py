from datetime import datetime, timedelta
from mage_ai.services.hightouch.config import HightouchConfig
from mage_ai.services.hightouch.constants import (
    HIGHTOUCH_BASE_URL,
    DEFAULT_POLL_INTERVAL,
    PENDING_STATUSES,
    SUCCESS,
    TERMINAL_STATUSES,
)
from mage_ai.shared.http_client import HttpClient
from typing import Dict, Optional, Union
import time


class HightouchClient(HttpClient):
    BASE_URL = HIGHTOUCH_BASE_URL

    def __init__(self, config: Union[Dict, HightouchConfig]):
        if type(config) is dict:
            self.config = HightouchConfig.load(config=config)
        else:
            self.config = config
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.config.api_key}',
        }

    def list_sources(self):
        return self.make_request('/sources')

    def get_source(self, source_id: int):
        return self.make_request(f'/sources/{source_id}')

    def list_destinations(self):
        return self.make_request('/destinations')

    def get_destination(self, destination_id: int):
        return self.make_request(f'/destinations/{destination_id}')

    def list_syncs(self):
        return self.make_request('/syncs')

    def get_sync(self, sync_id: int):
        return self.make_request(f'/syncs/{sync_id}')

    def list_sync_runs(self, sync_id: int, params: Dict = dict()):
        return self.make_request(f'/syncs/{sync_id}/runs', params=params)

    def trigger_sync(self, sync_id: int, payload: Dict = dict(fullResync=False)):
        return self.make_request(f'/syncs/{sync_id}/trigger', method='POST', payload=payload)

    def sync_and_poll(
        self,
        sync_id: int,
        payload: Dict = dict(fullResync=False),
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        poll_timeout: Optional[float] = None,
    ):
        trigger_response = self.trigger_sync(sync_id, payload=payload)
        run_id = trigger_response.get('id')
        if not run_id:
            raise Exception(f'Failed to trigger Hightouch sync {sync_id}')
        poll_start = datetime.now()
        while True:
            sync_run = self.list_sync_runs(sync_id, dict(runId=run_id))['data'][0]
            print(
                f"Polling Hightouch Sync {sync_id}. Current status: {sync_run['status']}. "
                f"{100 * sync_run.get('completionRatio', 0)}% completed."
            )

            if sync_run['status'] in TERMINAL_STATUSES:
                print(f"Sync request status: {sync_run['status']}. Polling complete")
                if sync_run['error']:
                    print(f"Sync Request Error: {sync_run['error']}")

                if sync_run['status'] == SUCCESS:
                    break
                raise Exception(
                    f"Sync {sync_id} for request: {run_id} failed with status: "
                    f"{sync_run['error']} and error:  {sync_run['error']}"
                )
            if sync_run['status'] not in PENDING_STATUSES:
                print(
                    f"Unexpected status: {sync_run['status']} returned for sync {sync_id} and "
                    f"request {run_id}. Will try again, but if you see this error, please let "
                    "someone at Hightouch know.",
                )
            if (
                poll_timeout
                and datetime.now()
                > poll_start + timedelta(seconds=poll_timeout)
            ):
                raise Exception(
                    f"Sync {sync_id} for run: {run_id} time out after "
                    f"{datetime.now() - poll_start}. Last status was {sync_run['status']}."
                )
            time.sleep(poll_interval)
