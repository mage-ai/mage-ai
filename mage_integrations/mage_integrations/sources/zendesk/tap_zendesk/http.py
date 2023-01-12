from time import sleep
import backoff
import requests
import singer
from requests.exceptions import Timeout, HTTPError



LOGGER = singer.get_logger()


class ZendeskError(Exception):
    def __init__(self, message=None, response=None):
        super().__init__(message)
        self.message = message
        self.response = response

class ZendeskBackoffError(ZendeskError):
    pass

class ZendeskBadRequestError(ZendeskError):
    pass

class ZendeskUnauthorizedError(ZendeskError):
    pass

class ZendeskForbiddenError(ZendeskError):
    pass

class ZendeskNotFoundError(ZendeskError):
    pass

class ZendeskConflictError(ZendeskError):
    pass

class ZendeskUnprocessableEntityError(ZendeskError):
    pass

class ZendeskRateLimitError(ZendeskBackoffError):
    pass

class ZendeskInternalServerError(ZendeskBackoffError):
    pass

class ZendeskNotImplementedError(ZendeskBackoffError):
    pass

class ZendeskBadGatewayError(ZendeskBackoffError):
    pass

class ZendeskServiceUnavailableError(ZendeskBackoffError):
    pass

ERROR_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": ZendeskBadRequestError,
        "message": "A validation exception has occurred."
    },
    401: {
        "raise_exception": ZendeskUnauthorizedError,
        "message": "The access token provided is expired, revoked, malformed or invalid for other reasons."
    },
    403: {
        "raise_exception": ZendeskForbiddenError,
        "message": "You are missing the following required scopes: read"
    },
    404: {
        "raise_exception": ZendeskNotFoundError,
        "message": "The resource you have specified cannot be found."
    },
    409: {
        "raise_exception": ZendeskConflictError,
        "message": "The API request cannot be completed because the requested operation would conflict with an existing item."
    },
    422: {
        "raise_exception": ZendeskUnprocessableEntityError,
        "message": "The request content itself is not processable by the server."
    },
    429: {
        "raise_exception": ZendeskRateLimitError,
        "message": "The API rate limit for your organisation/application pairing has been exceeded."
    },
    500: {
        "raise_exception": ZendeskInternalServerError,
        "message": "The server encountered an unexpected condition which prevented" \
            " it from fulfilling the request."
    },
    501: {
        "raise_exception": ZendeskNotImplementedError,
        "message": "The server does not support the functionality required to fulfill the request."
    },
    502: {
        "raise_exception": ZendeskBadGatewayError,
        "message": "Server received an invalid response."
    },
    503: {
        "raise_exception": ZendeskServiceUnavailableError,
        "message": "API service is currently unavailable."
    }
}
def is_fatal(exception):
    status_code = exception.response.status_code

    if status_code == 429:
        sleep_time = int(exception.response.headers['Retry-After'])
        LOGGER.info("Caught HTTP 429, retrying request in %s seconds", sleep_time)
        sleep(sleep_time)
        return False

    return 400 <=status_code < 500

def should_retry_error(exception):
    """
        Return true if exception is required to retry otherwise return false
    """
    if isinstance(exception, ZendeskConflictError):
        return True
    if isinstance(exception,Exception) and isinstance(exception.args[0][1],ConnectionResetError):
        return True
    return False

def raise_for_error(response):
    """ Error handling method which throws custom error. Class for each error defined above which extends `ZendeskError`.
    This method map the status code with `ERROR_CODE_EXCEPTION_MAPPING` dictionary and accordingly raise the error.
    If status_code is 200 then simply return json response.
    """
    try:
        response_json = response.json()
    except Exception: # pylint: disable=broad-except
        response_json = {}
    if response.status_code != 200:
        if response_json.get('error'):
            message = "HTTP-error-code: {}, Error: {}".format(response.status_code, response_json.get('error'))
        else:
            message = "HTTP-error-code: {}, Error: {}".format(
                response.status_code,
                response_json.get("message", ERROR_CODE_EXCEPTION_MAPPING.get(
                    response.status_code, {}).get("message", "Unknown Error")))
        exc = ERROR_CODE_EXCEPTION_MAPPING.get(
            response.status_code, {}).get("raise_exception", ZendeskError)
        raise exc(message, response) from None

def call_api(url, request_timeout, params, headers):
    @backoff.on_exception(backoff.expo,
                          (ZendeskConflictError),
                          max_tries=10,
                          giveup=lambda e: not should_retry_error(e))
    @backoff.on_exception(backoff.expo,
                          (HTTPError, ZendeskError), # Added support of backoff for all unhandled status codes.
                          max_tries=10,
                          giveup=is_fatal)
    @backoff.on_exception(backoff.expo,
                        (ConnectionError, Timeout),#As ConnectionError error and timeout error does not have attribute status_code,
                        max_tries=5, # here we added another backoff expression.
                        factor=2)
    def _call_api(url, request_timeout, params, headers):
        response = requests.get(url, params=params, headers=headers, timeout=request_timeout) # Pass request timeout
        raise_for_error(response)
        return response

    return _call_api(url, request_timeout, params, headers)

def get_cursor_based(url, access_token, request_timeout, cursor=None, **kwargs):
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {}'.format(access_token),
        **kwargs.get('headers', {})
    }

    params = {
        'page[size]': 100,
        **kwargs.get('params', {})
    }

    if cursor:
        params['page[after]'] = cursor
    response = call_api(url, request_timeout, params=params, headers=headers)
    response_json = response.json()

    yield response_json

    has_more = response_json['meta']['has_more']

    while has_more:
        cursor = response_json['meta']['after_cursor']
        params['page[after]'] = cursor

        response = call_api(url, request_timeout, params=params, headers=headers)
        response_json = response.json()

        yield response_json
        has_more = response_json['meta']['has_more']

def get_offset_based(url, access_token, request_timeout, **kwargs):
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {}'.format(access_token),
        **kwargs.get('headers', {})
    }

    params = {
        'per_page': 100,
        **kwargs.get('params', {})
    }

    response = call_api(url, request_timeout, params=params, headers=headers)
    response_json = response.json()

    yield response_json

    next_url = response_json.get('next_page')

    while next_url:
        response = call_api(next_url, request_timeout, params=None, headers=headers)
        response_json = response.json()

        yield response_json
        next_url = response_json.get('next_page')

def get_incremental_export(url, access_token, request_timeout, start_time):
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer {}'.format(access_token),
    }

    params = {'start_time': start_time.timestamp()}

    response = call_api(url, request_timeout, params=params, headers=headers)
    response_json = response.json()

    yield response_json

    end_of_stream = response_json.get('end_of_stream')

    while not end_of_stream:
        cursor = response_json['after_cursor']

        params = {'cursor': cursor}
        # Replaced below line of code with call_api method
        # response = requests.get(url, params=params, headers=headers)
        # response.raise_for_status()
        # Because it doing the same as call_api. So, now error handling will work properly with backoff
        # as earlier backoff was not possible
        response = call_api(url, request_timeout, params=params, headers=headers)

        response_json = response.json()

        yield response_json

        end_of_stream = response_json.get('end_of_stream')
