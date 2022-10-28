import json
from datetime import datetime, timedelta
from urllib.parse import quote
import backoff
import requests
from requests.exceptions import Timeout, ConnectionError

import singer
from singer import metrics
from singer import utils

BASE_URL = 'https://www.googleapis.com/webmasters/v3'
GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
LOGGER = singer.get_logger()

# set default timeout of 300 seconds
REQUEST_TIMEOUT = 300


class GoogleError(Exception):
    pass


class Server5xxError(GoogleError):
    pass


class GoogleBadRequestError(GoogleError):
    pass


class GoogleUnauthorizedError(GoogleError):
    pass


class GooglePaymentRequiredError(GoogleError):
    pass


class GoogleNotFoundError(GoogleError):
    pass


class GoogleMethodNotAllowedError(GoogleError):
    pass


class GoogleConflictError(GoogleError):
    pass


class GoogleGoneError(GoogleError):
    pass


class GooglePreconditionFailedError(GoogleError):
    pass


class GoogleRequestEntityTooLargeError(GoogleError):
    pass


class GoogleRequestedRangeNotSatisfiableError(GoogleError):
    pass


class GoogleExpectationFailedError(GoogleError):
    pass


class GoogleForbiddenError(GoogleError):
    pass


class GoogleUnprocessableEntityError(GoogleError):
    pass


class GooglePreconditionRequiredError(GoogleError):
    pass


class GoogleRateLimitExceeded(GoogleError):
    pass


class GoogleInternalServiceError(Server5xxError):
    pass


class GoogleNotImplementedError(Server5xxError):
    pass


class GoogleServiceUnavailable(Server5xxError):
    pass


class GoogleQuotaExceededError(GoogleError):
    pass


# Error Codes: https://developers.google.com/webmaster-tools/search-console-api-original/v3/errors
ERROR_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": GoogleBadRequestError,
        "message": "The request is missing or has bad parameters."
    },
    401: {
        "raise_exception": GoogleUnauthorizedError,
        "message": "Invalid authorization credentials."
    },
    402: {
        "raise_exception": GooglePaymentRequiredError,
        "message": "The requested operation requires more resources than the quota allows. "
                   "Payment is required to complete the operation."
    },
    403: {
        "raise_exception": GoogleForbiddenError,
        "message": "Invalid authorization credentials or permissions."
    },
    404: {
        "raise_exception": GoogleNotFoundError,
        "message": "The requested resource does not exist."
    },
    405: {
        "raise_exception": GoogleMethodNotAllowedError,
        "message": "The HTTP method associated with the request is not supported."
    },
    409: {
        "raise_exception": GoogleConflictError,
        "message": "The API request cannot be completed because the requested operation would conflict with an existing item."
    },
    410: {
        "raise_exception": GoogleGoneError,
        "message": "The requested resource is permanently unavailable."
    },
    412: {
        "raise_exception": GooglePreconditionFailedError,
        "message": "The condition set in the request's If-Match or If-None-Match HTTP request header was not met."
    },
    413: {
        "raise_exception": GoogleRequestEntityTooLargeError,
        "message": "The request is too large."
    },
    416: {
        "raise_exception": GoogleRequestedRangeNotSatisfiableError,
        "message": "The request specified a range that cannot be satisfied."
    },
    417: {
        "raise_exception": GoogleExpectationFailedError,
        "message": "A client expectation cannot be met by the server."
    },
    422: {
        "raise_exception": GoogleUnprocessableEntityError,
        "message": "The request was not able to process right now."
    },
    428: {
        "raise_exception": GooglePreconditionRequiredError,
        "message": "The request requires a precondition If-Match or If-None-Match which is not provided."
    },
    429: {
        "raise_exception": GoogleRateLimitExceeded,
        "message": "Rate limit has been exceeded."
    },
    500: {
        "raise_exception": GoogleInternalServiceError,
        "message": "The request failed due to an internal error."
    },
    501: {
        "raise_exception": GoogleNotImplementedError,
        "message": "Functionality does not exist."
    },
    503: {
        "raise_exception": GoogleServiceUnavailable,
        "message": "The API service is currently unavailable."
    }
}


def raise_for_error(response):
    # Forming a response message for raising custom exception

    try:
        response_json = response.json()
    except Exception:
        response_json = {}

    error_code = response.status_code
    error_message = response_json.get("error_description") or response_json.get("error",
        ERROR_CODE_EXCEPTION_MAPPING.get(error_code,
            {})).get("message", "An Unknown Error occurred, please try after some time.")

    message = "HTTP-error-code: {}, Error: {}".format(
        error_code, error_message)

    # Raise GoogleQuotaExceededError if 403 error code returned due to QuotaExceeded
    response_error = json.dumps(response_json.get('error', error_message))
    if error_code == 403 and "quotaExceeded" in response_error:
        ex = GoogleQuotaExceededError
    else:
        ex = ERROR_CODE_EXCEPTION_MAPPING.get(error_code, {}).get("raise_exception", GoogleError)
    raise ex(message) from None


class GoogleClient:
    def __init__(self,
                 client_id,
                 client_secret,
                 refresh_token,
                 site_urls,
                 user_agent=None,
                 timeout_from_config=REQUEST_TIMEOUT):
        self.__client_id = client_id
        self.__client_secret = client_secret
        self.__refresh_token = refresh_token
        self.__site_urls = site_urls
        self.__user_agent = user_agent
        self.__access_token = None
        self.__expires = None
        self.__session = requests.Session()
        self.base_url = None

        # if the 'timeout_from_config' value is 0, "0", "" or not passed then set default value of 300 seconds.
        if timeout_from_config and float(timeout_from_config):
            # update the request timeout for the requests
            self.request_timeout = float(timeout_from_config)
        else:
            # set the default timeout of 300 seconds
            self.request_timeout = REQUEST_TIMEOUT

    def check_sites_access(self):
        site_list = self.__site_urls.replace(" ", "").split(",")

        for site in site_list:
            site_encoded = quote(site, safe='')

            # Sample query API for check site access
            path = 'sites/{}/searchAnalytics/query'.format(site_encoded)
            body = {'startDate': '2021-04-01', 'endDate': '2021-05-01'}
            self.post(path=path, data=json.dumps(body))

    # during 'Timeout' error there is also possibility of 'ConnectionError',
    # hence added backoff for 'ConnectionError' too.
    # @backoff.on_exception(backoff.expo,
    #                       (Timeout, ConnectionError),
    #                       max_tries=5,
    #                       factor=2)
    def __enter__(self):
        self.get_access_token()
        return self

    def __exit__(self, exception_type, exception_value, traceback):
        self.__session.close()

    # @backoff.on_exception(backoff.expo,
    #                       Server5xxError,
    #                       max_tries=5,
    #                       factor=2)
    def get_access_token(self):
        # The refresh_token never expires and may be used many times to generate each access_token
        # Since the refresh_token does not expire, it is not included in get access_token response
        if self.__access_token is not None and self.__expires > datetime.utcnow():
            return

        headers = {}
        if self.__user_agent:
            headers['User-Agent'] = self.__user_agent

        response = self.__session.post(
            url=GOOGLE_TOKEN_URI,
            headers=headers,
            data={
                'grant_type': 'refresh_token',
                'client_id': self.__client_id,
                'client_secret': self.__client_secret,
                'refresh_token': self.__refresh_token,
            },
            timeout=self.request_timeout)

        if response.status_code != 200:
            raise_for_error(response)

        data = response.json()
        self.__access_token = data['access_token']
        self.__expires = datetime.utcnow() + timedelta(seconds=data['expires_in'])
        LOGGER.info('Authorized, token expires = {}'.format(self.__expires))

    # @backoff.on_exception(backoff.constant,
    #                       GoogleQuotaExceededError,
    #                       max_tries=2,  # Only retry once
    #                       interval=900,  # Backoff for 15 minutes in case of Quota Exceeded error
    #                       jitter=None)  # Interval value not consistent if jitter not None
    # # backoff for 5 times, with 10 seconds consistent interval
    # @backoff.on_exception(backoff.constant,
    #                       Timeout,
    #                       max_tries=5,
    #                       interval=10,
    #                       jitter=None) # Interval value not consistent if jitter not None
    # @backoff.on_exception(backoff.expo,
    #                       (Server5xxError, ConnectionError, GoogleRateLimitExceeded),
    #                       max_tries=7,
    #                       factor=3)
    # Rate Limit:
    #  https://developers.google.com/webmaster-tools/search-console-api-original/v3/limits
    @utils.ratelimit(1200, 60)
    def request(self, method, path=None, url=None, **kwargs):

        self.get_access_token()

        if not url and self.base_url is None:
            self.base_url = BASE_URL

        if not url and path:
            url = '{}/{}'.format(self.base_url, path)

        # endpoint = stream_name (from sync.py API call)
        if 'endpoint' in kwargs:
            endpoint = kwargs['endpoint']
            del kwargs['endpoint']
        else:
            endpoint = None

        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        kwargs['headers']['Authorization'] = 'Bearer {}'.format(self.__access_token)

        if self.__user_agent:
            kwargs['headers']['User-Agent'] = self.__user_agent

        if method == 'POST':
            kwargs['headers']['Content-Type'] = 'application/json'

        with metrics.http_request_timer(endpoint) as timer:
            response = self.__session.request(method, url, timeout=self.request_timeout, **kwargs)
            timer.tags[metrics.Tag.http_status_code] = response.status_code

        if response.status_code != 200:
            raise_for_error(response)

        return response.json()

    def get(self, path, **kwargs):
        return self.request('GET', path=path, **kwargs)

    def post(self, path, **kwargs):
        return self.request('POST', path=path, **kwargs)
