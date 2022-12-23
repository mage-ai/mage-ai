from typing import Dict
import json
import requests


class HttpClient:
    BASE_URL = None

    def __init__(self):
        self.headers = {
            'Content-Type': 'application/json',
        }

    def make_request(
        self,
        url_path: str,
        method: str = 'GET',
        params: Dict = dict(),
        payload: Dict = dict()
    ):

        url = self.BASE_URL + url_path
        response = None
        if method == 'GET':
            response = requests.get(
                url,
                headers=self.headers,
                params=params,
            )
        elif method == 'POST':
            response = requests.post(
                url,
                data=json.dumps(payload),
                headers=self.headers,
            )
        if response is not None:
            response.raise_for_status()
            return response.json()
        return response
