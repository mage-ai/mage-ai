from datetime import datetime, timedelta
from mage_ai.services.stitch.config import StitchConfig
from mage_ai.services.stitch.constants import (
    DEFAULT_POLL_INTERVAL,
    DEFAULT_POLL_TIMEOUT,
    STITCH_BASE_URL,
)
from mage_ai.shared.http_client import HttpClient
from typing import Dict, List, Optional, Union
import requests
import time

LOG_TEXT_FOR_STREAMS_WITH_EXTRACTED_ROWS = 'com.stitchdata.target-stitch-avro.flush-pipeline - send-stream-record-count-impl'


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

    def check_sync_completion(
        self,
        source_id: str,
        job_name: str,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        poll_timeout: Optional[float] = DEFAULT_POLL_TIMEOUT,
        autocomplete_after_seconds: int = None,
    ):
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
        stream_names = self.__get_streams_extracted_from_extraction_job(stitch_client_id, job_name)
        while True:
            succeeded_streams = set()
            total_loads_count = None
            current_count = 0
            page = 1
            while True:
                # Fetch loads with pagination
                loads_response = self.list_loads(stitch_client_id, page=page)
                loads = loads_response['data']
                if total_loads_count is None:
                    total_loads_count = loads_response['total']
                current_count += len(loads)
                loads = [load for load in loads if load['source_name'] == source['name']
                         and load['stream_name'] in stream_names]
                for load in loads:
                    if load['error_state'] is not None:
                        error_message = load['error_state']['notification_data']['warehouse_message']
                        raise Exception(
                            f"Failed to load data for stream {load['stream_name']} with "
                            f"message: \"{error_message}\"."
                        )
                    elif load['last_batch_loaded_at'] >= extraction_completion_time:
                        succeeded_streams.add(load['stream_name'])
                page += 1
                if current_count >= total_loads_count:
                    break

            succeeded_streams = list(succeeded_streams)
            total_streams = len(stream_names)
            completed_streams = len(succeeded_streams)

            if completed_streams == total_streams:
                print(f'Finish loading data for all streams: {succeeded_streams}.')
                break
            elif autocomplete_after_seconds and \
                datetime.now().timestamp() - autocomplete_after_seconds >= poll_start.timestamp():
                print(f'Automatically setting job as complete after {autocomplete_after_seconds} seconds.')
                break
            else:
                percent_complete = round(
                    100 * (completed_streams / total_streams),
                    2,
                ) if total_streams else 0
                running_streams = [s for s in stream_names if s not in succeeded_streams]
                print(
                    f'Polling Stitch load status for source {source_id}: {percent_complete}% ({completed_streams}/{total_streams}). '
                    f'Completed streams: {succeeded_streams}. '
                    f'Running streams: {running_streams}.'
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

    def start_replication_job(
        self,
        source_id: int,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        poll_timeout: Optional[float] = DEFAULT_POLL_TIMEOUT,
        autocomplete_after_seconds: int = None,
        disable_polling: bool = False,
    ):
        response = self.make_request(f'/sources/{source_id}/sync', method='POST', payload=dict())
        if 'error' in response:
            raise Exception(response['error']['message'])
        job_name = response['job_name']
        print(f'Start replication job for source {source_id}. Job name: {job_name}.')

        if disable_polling:
            return response

        self.check_sync_completion(
            source_id,
            job_name,
            poll_interval=poll_interval,
            poll_timeout=poll_timeout,
            autocomplete_after_seconds=autocomplete_after_seconds,
        )

        return response

    def __get_logs_for_extraction(self, stitch_client_id: int, job_name: str) -> str:
        url = f'{STITCH_BASE_URL}/{stitch_client_id}/extractions/{job_name}'
        response = requests.get(url, headers=self.headers)
        return response.text

    def __get_streams_extracted_from_extraction_job(
        self,
        stitch_client_id: int,
        job_name: str,
    ) -> List[str]:
        logs = self.__get_logs_for_extraction(stitch_client_id, job_name)
        streams = set()
        for line in logs.split('\n'):
            if LOG_TEXT_FOR_STREAMS_WITH_EXTRACTED_ROWS in line:
                stream_name = line.split(LOG_TEXT_FOR_STREAMS_WITH_EXTRACTED_ROWS)[1].strip()
                streams.add(stream_name)
        return streams
