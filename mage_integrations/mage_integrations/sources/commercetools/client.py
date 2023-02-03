from mage_integrations.sources.http.client import Client as BaseClient
from typing import Dict
import requests


class Client(BaseClient):
    """
    Authorization: https://docs.commercetools.com/api/authorization
    """

    def __init__(self, config: Dict, logger):
        super().__init__(config)
        access_token = self.get_access_token()
        self.token = f"Bearer {access_token}"
        self.logger = logger

    @property
    def base_url(self):
        return f"https://api.{self.config['region']}.{self.config['host']}."\
               f"commercetools.com/{self.config['project_key']}"

    def get_access_token(self):
        url = f"https://auth.{self.config['region']}.{self.config['host']}.commercetools."\
              f"com/oauth/token?grant_type=client_credentials&scope=manage_project:"\
              f"{self.config['project_key']}"

        response = requests.post(
            url,
            auth=(self.config['client_id'], self.config['client_secret']),
        )
        json_response = response.json()
      
        return json_response.get('access_token') if json_response is not None else None

    def get_headers(self):
        return {
            'Authorization': self.token,
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
        if url is None and path is None:
            return
        if url is None:
            url = self.base_url + path

        return self.make_request(url, method=method, params=params, body=body)
