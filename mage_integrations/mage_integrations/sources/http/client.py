from typing import Dict
from singer import utils

import requests
import singer


LOGGER = singer.get_logger()

REQUEST_TIMEOUT = 300


class HttpError(Exception):
    pass


class Server4xxError(HttpError):
    pass


class Server5xxError(HttpError):
    pass


class BadRequestError(Server4xxError):
    pass


class AuthenticationError(Server4xxError):
    pass


class ForbiddenError(Server4xxError):
    pass


class NotFoundError(Server4xxError):
    pass


class MethodNotAllowedError(Server4xxError):
    pass


class NotProcessedError(Server4xxError):
    pass


class RateLimitError(Server4xxError):
    pass


class InternalServiceError(Server5xxError):
    pass


class ServiceUnavailableError(Server5xxError):
    pass


STATUS_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": BadRequestError,
        "message": "The request URI does not match the APIs in the system.",
    },
    401: {
        "raise_exception": AuthenticationError,
        "message": "The user is not authenticated to use the API.",
    },
    403: {
        "raise_exception": ForbiddenError,
        "message": "The requested operation is not permitted for the user.",
    },
    404: {
        "raise_exception": NotFoundError,
        "message": "The requested resource was not found.",
    },
    405: {
        "raise_exception": MethodNotAllowedError,
        "message": "The HTTP action is not allowed for the requested REST API.",
    },
    409: {
        "raise_exception": NotProcessedError,
        "message": "The request could not be processed because of conflict in the request.",
    },
    429: {
        "raise_exception": RateLimitError,
        "message": "You are requesting too many requests.",
    },
    500: {
        "raise_exception": InternalServiceError,
        "message": "The request could not be processed due to internal server error.",
    },
    503: {
        "raise_exception": ServiceUnavailableError,
        "message": "The request could not be processed due to temporary internal server error.",
    },
}


def get_exception_for_status_code(status_code):
    """Map the input status_code with the corresponding Exception Class \
        using 'STATUS_CODE_EXCEPTION_MAPPING' dictionary."""

    exception = STATUS_CODE_EXCEPTION_MAPPING.get(status_code, {}).get(
                "raise_exception")
    # If exception is not mapped for any code then use Server4xxError and Server5xxError respectively
    if not exception:
        if status_code > 400 and status_code < 500:
            exception = Server4xxError
        elif status_code > 500:
            exception = Server5xxError
        else:
            exception = HttpError
    return exception


def raise_for_error(response):
    """Raises error class with appropriate msg for the response"""
    try:
        json_response = response.json()

    except Exception:
        json_response = {}

    status_code = response.status_code

    msg = json_response.get(
        "message",
        STATUS_CODE_EXCEPTION_MAPPING.get(status_code, {}).get(
            "message", "Unknown Error"
        ),
    )
    message = "HTTP-error-code: {}, Error: {}".format(status_code, msg)

    exc = get_exception_for_status_code(status_code)
    raise exc(message) from None


class Client():
    def __init__(self, config, logger=None, api_result_limit=100):
        self.config = config
        self.logger = logger if logger is not None else LOGGER
        
        self.api_result_limit = api_result_limit

    def get_headers(self):
        headers = {}

        return headers

    def get_params(self, params):
        return params

    @utils.ratelimit(100, 60)
    def make_request(self, url, method='get', params=None, body=None) -> Dict:
        if params is None:
            params = {}
        
        config_request_timeout = self.config.get('request_timeout')
        if config_request_timeout and float(config_request_timeout):
            request_timeout = float(config_request_timeout)
        else:
            # If value is 0,"0","" or not passed then set default to 300 seconds.
            request_timeout = REQUEST_TIMEOUT

        response = requests.request(
            method,
            url,
            headers=self.get_headers(),
            params=self.get_params(params),
            json=body,
            timeout=request_timeout,
        )

        if response.status_code != 200:
            raise_for_error(response)

        return response.json()
