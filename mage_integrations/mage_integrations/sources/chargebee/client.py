from singer import utils
import requests
import singer


LOGGER = singer.get_logger()

REQUEST_TIMEOUT = 300


class ChargebeeError(Exception):
    pass


class Server4xxError(ChargebeeError):
    pass


class Server5xxError(ChargebeeError):
    pass


class ChargebeeBadRequestError(Server4xxError):
    pass


class ChargebeeAuthenticationError(Server4xxError):
    pass


class ChargebeeForbiddenError(Server4xxError):
    pass


class ChargebeeNotFoundError(Server4xxError):
    pass


class ChargebeeMethodNotAllowedError(Server4xxError):
    pass


class ChargebeeNotProcessedError(Server4xxError):
    pass


class ChargebeeRateLimitError(Server4xxError):
    pass


class ChargebeeInternalServiceError(Server5xxError):
    pass


class ChargebeeServiceUnavailableError(Server5xxError):
    pass


STATUS_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": ChargebeeBadRequestError,
        "message": "The request URI does not match the APIs in the system.",
    },
    401: {
        "raise_exception": ChargebeeAuthenticationError,
        "message": "The user is not authenticated to use the API.",
    },
    403: {
        "raise_exception": ChargebeeForbiddenError,
        "message": "The requested operation is not permitted for the user.",
    },
    404: {
        "raise_exception": ChargebeeNotFoundError,
        "message": "The requested resource was not found.",
    },
    405: {
        "raise_exception": ChargebeeMethodNotAllowedError,
        "message": "The HTTP action is not allowed for the requested REST API.",
    },
    409: {
        "raise_exception": ChargebeeNotProcessedError,
        "message": "The request could not be processed because of conflict in the request.",
    },
    429: {
        "raise_exception": ChargebeeRateLimitError,
        "message": "You are requesting to many requests.",
    },
    500: {
        "raise_exception": ChargebeeInternalServiceError,
        "message": "The request could not be processed due to internal server error.",
    },
    503: {
        "raise_exception": ChargebeeServiceUnavailableError,
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
            exception = ChargebeeError
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


class ChargebeeClient():
    def __init__(self, config, api_result_limit=100, include_deleted=True):
        self.config = config

        self.api_result_limit = api_result_limit
        self.include_deleted = include_deleted
        self.user_agent = self.config.get('user_agent')

        if self.config.get('include_deleted') in ['false','False', False]:
            self.include_deleted = False

    def get_headers(self):
        headers = {}

        if self.config.get('user_agent'):
            headers['User-Agent'] = self.config.get('user_agent')

        return headers

    def get_params(self, params):

        if params is None:
            params = {}

        params['limit'] = self.api_result_limit
        params['include_deleted'] = self.include_deleted

        return params

    @utils.ratelimit(100, 60)
    def make_request(self, url, method, params=None, body=None):

        if params is None:
            params = {}

        LOGGER.info("Making {} request to {}".format(method, url))

        # Set request timeout to config param `request_timeout` value.
        config_request_timeout = self.config.get('request_timeout')
        if config_request_timeout and float(config_request_timeout):
            request_timeout = float(config_request_timeout)
        else:
            # If value is 0,"0","" or not passed then set default to 300 seconds.
            request_timeout = REQUEST_TIMEOUT

        response = requests.request(
            method,
            url,
            auth=(self.config.get("api_key"), ''),
            headers=self.get_headers(),
            params=self.get_params(params),
            json=body,
            timeout=request_timeout)

        if response.status_code != 200:
            raise_for_error(response)

        return response.json()
