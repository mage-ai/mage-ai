from typing import Dict
import backoff
import json
import requests
import time


class RateLimitException(Exception):
    pass


class MetricsRateLimitException(Exception):
    pass


class Client(object):
    BASE_URL = 'https://api2.frontapp.com'

    def __init__(self, config, logger):
        self.config = config or dict()
        self.token = f"Bearer {self.config.get('token')}"
        self.logger = logger
        self.session = requests.Session()

        self.calls_remaining = None
        self.limit_reset = None

    def url(self, path):
        if path.startswith(self.BASE_URL):
            return path
        return self.BASE_URL + path

    @backoff.on_exception(backoff.expo,
                          RateLimitException,
                          max_tries=10,
                          factor=2)
    def request(self, method: str = 'get', path: str = None, url: str = None, **kwargs):
        if not path and not url:
            return
        if not url:
            url = self.url(path)

        if self.calls_remaining is not None and self.calls_remaining == 0:
            wait = self.limit_reset - int(time.monotonic())
            if 0 < wait <= 300:
                time.sleep(wait)

        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        if self.token:
            kwargs['headers']['Authorization'] = self.token

        kwargs['headers']['Content-Type'] = 'application/json'
        response = requests.request(method, url, **kwargs)

        self.calls_remaining = int(response.headers['X-Ratelimit-Remaining'])
        self.limit_reset = int(float(response.headers['X-Ratelimit-Reset']))

        if response.status_code in [429, 503]:
            raise RateLimitException()
        if response.status_code == 423:
            raise MetricsRateLimitException()
        try:
            response.raise_for_status()
        except Exception:
            self.logger.error('{} - {}'.format(response.status_code, response.text))
            raise

        return response.json()

    def get(self, path: str = None, url: str = None, **kwargs):
        return self.request(method='get', path=path, url=url, **kwargs)

    def post(self, path: str = None, url: str = None, data: Dict = dict(), **kwargs):
        kwargs['data'] = json.dumps(data)
        return self.request(method='post', path=path, url=url, **kwargs)
