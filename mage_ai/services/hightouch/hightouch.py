from mage_ai.services.hightouch.config import HightouchConfig
from typing import Dict, Union
import json
import requests

HIGHTOUCH_BASE_URL = 'https://api.hightouch.com/api/v1'


class HightouchClient:
    def __init__(self, config: Union[Dict, HightouchConfig]):
        if type(config) is dict:
            self.config = HightouchConfig.load(config=config)
        else:
            self.config = config

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

    def list_sync_runs(self, sync_id: int):
        return self.make_request(f'/syncs/{sync_id}/runs')

    def trigger_sync(self, sync_id: int, payload: Dict = dict(fullResync=False)):
        return self.make_request(f'/syncs/{sync_id}/trigger', method='POST', payload=payload)

    def sync_and_poll(self):
        pass

    def make_request(self, url_path: str, method: str = 'GET', payload: Dict = dict()):
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.config.api_key}',
        }
        url = HIGHTOUCH_BASE_URL + url_path
        response = None
        if method == 'GET':
            response = requests.get(
                url,
            )
        elif method == 'POST':
            response = requests.post(
                url,
                data=json.dumps(payload),
                headers=headers,
            )
        if response is not None:
            response.raise_for_status()
            return response.json()
        return response
