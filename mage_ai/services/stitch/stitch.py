from datetime import datetime, timedelta
from mage_ai.services.stitch.config import StitchConfig
from mage_ai.services.stitch.constants import (
    DEFAULT_POLL_INTERVAL,
    DEFAULT_POLL_TIMEOUT,
    STITCH_BASE_URL,
)
from mage_ai.shared.http_client import HttpClient
from typing import Dict, Optional, Union
import time


class StitchClient(HttpClient):
    """
    API doc: https://www.stitchdata.com/docs/developers/stitch-connect/api
    """

    BASE_URL = STITCH_BASE_URL

    def __init__(self, config: Union[Dict, StitchConfig]):
        if type(config) is dict:
            self.config = StitchConfig.load(config=config)
        else:
            self.config = config
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.config.access_token}',
        }

    def list_sources(self):
        return self.make_request('/sources')

    def get_source(self, source_id: int):
        return self.make_request(f'/sources/{source_id}')

    def list_streams(self, source_id: int, selected: bool = True):
        streams = self.make_request(f'/sources/{source_id}/streams')
        if selected:
            streams = [s for s in streams if s['selected']]
        return streams

    def list_destinations(self):
        return self.make_request('/destinations')

    def get_destination(self, destination_id: int):
        return self.make_request(f'/destinations/{destination_id}')

    def list_extractions(self, stitch_client_id: int, page: int = 1):
        return self.make_request(f'/{stitch_client_id}/extractions', params=dict(page=page))

    def list_loads(self, stitch_client_id: int, page: int = 1):
        return self.make_request(f'/{stitch_client_id}/loads', params=dict(page=page))

    def start_replication_job(
        self,
        source_id: int,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        poll_timeout: Optional[float] = DEFAULT_POLL_TIMEOUT,
    ):
        response = self.make_request(f'/sources/{source_id}/sync', method='POST', payload=dict())
        if 'error' in response:
            raise Exception(response['error']['message'])
        job_name = response['job_name']
        print(f'Start replication job for source {source_id}. Job name: {job_name}.')

        source = self.get_source(source_id)
        stitch_client_id = source['stitch_client_id']

        # Poll status for Extraction job
        poll_start = datetime.now()
        extraction_completion_time = None
        while True:
            extractions = self.list_extractions(stitch_client_id)['data']
            extractions = [e for e in extractions if e['job_name'] == job_name]
            if len(extractions) == 0:
                print(
                    f'Polling Stitch extraction status for source {source_id}. Current status: running.'
                )
            else:
                extraction = extractions[0]

                if extraction['discovery_exit_status'] is None:
                    print(
                        f'Polling Stitch extraction status for source {source_id}. '
                        'Current status: running.'
                    )
                elif extraction['discovery_exit_status'] == 0:
                    extraction_completion_time = extraction['completion_time']
                    print(f'Extraction for source {source_id} completed.')
                    break
                else:
                    error_message = extraction['discovery_description']
                    raise Exception(
                        f'Extraction for source {source_id} failed with message: \"{error_message}\".'
                    )
            if (
                poll_timeout
                and datetime.now()
                > poll_start + timedelta(seconds=poll_timeout)
            ):
                raise Exception(
                    f'Extraction for source {source_id} times out after {datetime.now() - poll_start}.'
                )
            time.sleep(poll_interval)

        # Poll status for Load job
        poll_start = datetime.now()
        streams = self.list_streams(source_id)
        stream_names = [s['stream_name'] for s in streams]
        while True:
            loads = self.list_loads(stitch_client_id)['data']
            loads = [load for load in loads if load['source_name'] == source['name']
                     and load['stream_name'] in stream_names]

            succeeded_streams = []
            for load in loads:
                if load['error_state'] is not None:
                    error_message = load['error_state']['notification_data']['warehouse_message']
                    raise Exception(
                        f"Failed to load data for stream {load['stream_name']} with "
                        f"message: \"{error_message}\"."
                    )
                elif load['last_batch_loaded_at'] >= extraction_completion_time:
                    succeeded_streams.append(load['stream_name'])
            if len(succeeded_streams) == len(stream_names):
                print(f'Finish loading data for all streams: {succeeded_streams}.')
                break
            else:
                running_streams = [s for s in stream_names if s not in succeeded_streams]
                print(
                    f'Polling Stitch load status for source {source_id}. Completed streams: '
                    f'{succeeded_streams}. Running streams: {running_streams}.'
                )
            if (
                poll_timeout
                and datetime.now()
                > poll_start + timedelta(seconds=poll_timeout)
            ):
                raise Exception(
                    f'Load for source {source_id} times out after {datetime.now() - poll_start}.'
                )
            time.sleep(poll_interval)

        return response
