import requests
from singer import metrics, utils
import singer

LOGGER = singer.get_logger()

API_VERSION = '2.0'

REQUEST_TIMEOUT = 300


class Server5xxError(Exception):
    pass


class Server429Error(Exception):
    pass


class IntercomError(Exception):
    pass


class IntercomBadRequestError(IntercomError):
    pass


class IntercomScrollExistsError(IntercomError):
    pass


class IntercomUnauthorizedError(IntercomError):
    pass


class IntercomPaymentRequiredError(IntercomError):
    pass


class IntercomForbiddenError(IntercomError):
    pass


class IntercomNotFoundError(IntercomError):
    pass


class IntercomMethodNotAllowedError(IntercomError):
    pass


class IntercomNotAcceptableError(IntercomError):
    pass


class IntercomRequestTimeoutError(IntercomError):
    pass


class IntercomConflictError(IntercomError):
    pass


class IntercomUserConflictError(IntercomError):
    pass


class IntercomUnsupportedMediaTypeError(IntercomError):
    pass


class IntercomUnprocessableEntityError(IntercomError):
    pass


class IntercomInternalServiceError(IntercomError):
    pass


# Error codes: https://developers.intercom.com/intercom-api-reference/reference#http-responses
ERROR_CODE_EXCEPTION_MAPPING = {
    400: IntercomBadRequestError,
    401: IntercomUnauthorizedError,
    402: IntercomPaymentRequiredError,
    403: IntercomForbiddenError,
    404: IntercomNotFoundError,
    405: IntercomMethodNotAllowedError,
    406: IntercomNotAcceptableError,
    408: IntercomRequestTimeoutError,
    409: IntercomUserConflictError,
    415: IntercomUnsupportedMediaTypeError,
    422: IntercomUnprocessableEntityError,
    423: IntercomScrollExistsError,
    500: IntercomInternalServiceError}


def get_exception_for_error_code(error_code, intercom_error_code):

    if intercom_error_code == 'scroll_exists':
        error_code = 423
    return ERROR_CODE_EXCEPTION_MAPPING.get(error_code, IntercomError)


def raise_for_error(response):
    try:
        response.raise_for_status()
    except (requests.HTTPError, requests.ConnectionError) as error:
        try:
            content_length = len(response.content)
            if content_length == 0:
                # There is nothing we can do here since Intercom has neither sent
                # us a 2xx response nor a response content.
                return
            response_json = response.json()
            status_code = response.status_code
            LOGGER.error('RESPONSE: {}'.format(response_json))
            # Error Message format:
            #  https://developers.intercom.com/intercom-api-reference/reference#error-objects
            if response_json.get('type') == 'error.list':
                message = ''
                for err in response_json['errors']:
                    error_message = err.get('message')
                    error_code = err.get('code')
                    ex = get_exception_for_error_code(error_code=status_code, intercom_error_code=error_code)
                    if status_code == 401 and 'access_token' in error_code:
                        LOGGER.error(
                            "Your API access_token is expired/invalid as per Intercom’s "
                            "security policy. \n Please re-authenticate your connection to "
                            "generate a new access_token and resume extraction.")
                    message = '{}: {}\n{}'.format(error_code, error_message, message)
                raise ex('{}'.format(message)) from error
            raise IntercomError(error) from error
        except (ValueError, TypeError) as inner_error:
            raise IntercomError(error) from inner_error


class IntercomClient(object):
    def __init__(self,
                 access_token,
                 config_request_timeout, # request_timeout parameter
                 user_agent=None):
        self.__access_token = access_token
        self.__user_agent = user_agent
        # Rate limit initial values, reset by check_access_token headers
        self.__session = requests.Session()
        self.__verified = False
        self.base_url = 'https://api.intercom.io'

        # Set request timeout to config param `request_timeout` value.
        # If value is 0,"0","" or not passed then it set default to 300 seconds.
        if config_request_timeout and float(config_request_timeout):
            self.__request_timeout = float(config_request_timeout)
        else:
            self.__request_timeout = REQUEST_TIMEOUT

    # `check_access_token` may throw timeout error. `request` method also call `check_access_token`.
    # So, to add backoff over `check_access_token` may cause 5*5 = 25 times backoff which is not expected.
    # That's why added backoff here.
    def __enter__(self):
        self.__verified = self.check_access_token()
        return self

    def __exit__(self, exception_type, exception_value, traceback):
        self.__session.close()

    @utils.ratelimit(1000, 60)
    def check_access_token(self):
        if self.__access_token is None:
            raise Exception('Error: Missing access_token.')
        headers = {}
        if self.__user_agent:
            headers['User-Agent'] = self.__user_agent
        headers['Authorization'] = 'Bearer {}'.format(self.__access_token)
        headers['Accept'] = 'application/json'
        headers['Intercom-Version'] = API_VERSION
        response = self.__session.get(
            # Simple endpoint that returns 1 Account record (to check API/access_token access):
            url='{}/{}'.format(self.base_url, 'tags'),
            timeout=self.__request_timeout, # Pass request timeout
            headers=headers)
        if response.status_code != 200:
            LOGGER.error('Error status_code = {}'.format(response.status_code))
            raise_for_error(response)
        else:
            resp = response.json()
            if 'type' in resp:
                return True
            return False

    # Rate limiting:
    #  https://developers.intercom.com/intercom-api-reference/reference#rate-limiting
    @utils.ratelimit(1000, 60)
    def request(self, method, path=None, url=None, **kwargs):
        if not self.__verified:
            self.__verified = self.check_access_token()

        if not url and path:
            url = '{}/{}'.format(self.base_url, path)

        LOGGER.info("URL: {} {}, Params: {}, JSON Body: {}".format(
            method,
            url,
            kwargs.get("params"),
            kwargs.get("json"),
        ))

        if 'endpoint' in kwargs:
            endpoint = kwargs['endpoint']
            del kwargs['endpoint']
        else:
            endpoint = None

        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        kwargs['headers']['Authorization'] = 'Bearer {}'.format(self.__access_token)
        kwargs['headers']['Accept'] = 'application/json'
        kwargs['headers']['Intercom-Version'] = API_VERSION

        if self.__user_agent:
            kwargs['headers']['User-Agent'] = self.__user_agent

        if method == 'POST':
            kwargs['headers']['Content-Type'] = 'application/json'

        with metrics.http_request_timer(endpoint) as timer:
            response = self.__session.request(method, url, timeout=self.__request_timeout, **kwargs)
            timer.tags[metrics.Tag.http_status_code] = response.status_code

        if response.status_code >= 500:
            raise Server5xxError()

        if response.status_code != 200:
            raise_for_error(response)

        return response.json()

    def get(self, path, **kwargs):
        return self.request('GET', path=path, **kwargs)

    def post(self, path, **kwargs):
        return self.request('POST', path=path, **kwargs)

    def perform(self, method, path, **kwargs):
        if method=='POST':
            return self.post(path, **kwargs)
        return self.get(path, **kwargs)
