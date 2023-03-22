import time
from datetime import datetime, timedelta

import backoff
import requests
import singer
from singer import metrics, utils
from requests.exceptions import ConnectionError

LOGGER = singer.get_logger()


class Server5xxError(Exception):
    pass


class RateLimitError(Exception):
    pass


class OutreachClient(object):
    BASE_URL = 'https://api.outreach.io/api/v2/'

    def __init__(self, config, logger=LOGGER):
        self.__user_agent = config.get('user_agent')
        self.__client_id = config.get('client_id')
        self.__client_secret = config.get('client_secret')
        self.__redirect_uri = config.get('redirect_uri')
        self.__refresh_token = config.get('refresh_token')
        self.__quota_limit = config.get('quota_limit')
        self.__access_token = None
        self.__expires_at = None
        self.__session = requests.Session()
        self.logger = logger

    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        self.__session.close()

    def refresh(self):
        data = self.request(
            'POST',
            url='https://api.outreach.io/oauth/token',
            skip_quota=True,
            data={
                'client_id': self.__client_id,
                'client_secret': self.__client_secret,
                'redirect_uri': self.__redirect_uri,
                'refresh_token': self.__refresh_token,
                'grant_type': 'refresh_token'
            })

        self.__access_token = data['access_token']

        self.__expires_at = datetime.utcnow() + \
            timedelta(seconds=data['expires_in'] -
                      10)  # pad by 10 seconds for clock drift

    def sleep_for_reset_period(self, response):
        if response.headers.get('x-ratelimit-reset'):
            reset = datetime.fromtimestamp(
                int(response.headers['x-ratelimit-reset']))
            sleep_time = (reset - datetime.now()).total_seconds() + 10
        else:
            self.logger.info('Key x-ratelimit-reset is not in response header.')
            sleep_time = 30
        self.logger.info(
            'Sleeping for {:.2f} seconds for next rate limit window'.format(sleep_time))
        time.sleep(sleep_time)

    @backoff.on_exception(backoff.expo,
                          (Server5xxError, RateLimitError, ConnectionError),
                          max_tries=5,
                          factor=3)
    # Rate Limit: https://api.outreach.io/api/v2/docs#rate-limiting
    @utils.ratelimit(10000, 3600)
    def request(self, method, path=None, url=None, skip_quota=False, **kwargs):
        if url is None and \
            (self.__access_token is None or
             self.__expires_at <= datetime.utcnow()):
            self.refresh()

        if url is None and path:
            url = '{}{}'.format(self.BASE_URL, path)

        if 'endpoint' in kwargs:
            endpoint = kwargs['endpoint']
            del kwargs['endpoint']
        else:
            endpoint = None

        if 'headers' not in kwargs:
            kwargs['headers'] = {}

        kwargs['headers']['Authorization'] = 'Bearer {}'.format(
            self.__access_token)

        if self.__user_agent:
            kwargs['headers']['User-Agent'] = self.__user_agent

        with metrics.http_request_timer(endpoint) as timer:
            response = self.__session.request(method, url, **kwargs)
            timer.tags[metrics.Tag.http_status_code] = response.status_code

        if response.status_code >= 500:
            raise Server5xxError(response.text)

        if response.status_code == 429:
            self.logger.info('Rate limit hit - 429')
            self.sleep_for_reset_period(response)
            raise RateLimitError()

        response.raise_for_status()

        if not skip_quota and self.__quota_limit:
            # quota_limit > (1 - (X-RateLimit-Remaining / X-RateLimit-Limit))
            quota_used = 1 - int(response.headers['x-ratelimit-remaining']) / \
                int(response.headers['x-ratelimit-remaining'])
            if quota_used > float(self.__quota_limit):
                self.logger.info(
                    'Quota used: {:.2f} / {}'.format(quota_used, self.__quota_limit))
                self.sleep_for_reset_period(response)

        return response.json()

    def get(self, url=None, path=None, **kwargs):
        return self.request('GET', url=url, path=path, **kwargs)
