from mage_integrations.sources.http.client import Client as BaseClient
from typing import Dict


class Client(BaseClient):
    """
    Authentication: https://developer.monday.com/api-reference/docs/authentication
    """

    def __init__(self, config: Dict, logger):
        super().__init__(config)
        self.logger = logger

    @property
    def base_url(self):
        return 'https://api.monday.com/v2'

    def get_headers(self):
        return {
            'Authorization': self.config['api_token'],
            'Content-Type': 'application/json'
        }

    def request(
        self,
        method: str = 'get',
        path: str = None,
        url: str = None,
        params=None,
        body=None,
    ):
        if url is None:
            url = self.base_url

        return self.make_request(url, method=method, params=params, body=body)
