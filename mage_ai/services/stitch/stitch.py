from mage_ai.services.stitch.config import StitchConfig
from mage_ai.services.stitch.constants import (
    STITCH_BASE_URL,
)
from mage_ai.shared.http_client import HttpClient
from typing import Dict, Union


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

    def list_destinations(self):
        return self.make_request('/destinations')

    def get_destination(self, destination_id: int):
        return self.make_request(f'/destinations/{destination_id}')

    def start_replication_job(self, source_id: int):
        response = self.make_request(f'/sources/{source_id}/sync', method='POST', payload=dict())
        return response
