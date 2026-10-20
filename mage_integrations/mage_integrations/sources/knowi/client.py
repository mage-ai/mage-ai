import requests
from singer import metrics, utils

REQUEST_TIMEOUT = 300


class Server5xxError(Exception):
    pass


class Server429Error(Exception):
    pass


class KnowiError(Exception):
    pass


class KnowiBadRequestError(KnowiError):
    pass


class KnowiScrollExistsError(KnowiError):
    pass


class KnowiUnauthorizedError(KnowiError):
    pass


class KnowiPaymentRequiredError(KnowiError):
    pass


class KnowiForbiddenError(KnowiError):
    pass


class KnowiNotFoundError(KnowiError):
    pass


class KnowiMethodNotAllowedError(KnowiError):
    pass


class KnowiNotAcceptableError(KnowiError):
    pass


class KnowiRequestTimeoutError(KnowiError):
    pass


class KnowiConflictError(KnowiError):
    pass


class KnowiUserConflictError(KnowiError):
    pass


class KnowiUnsupportedMediaTypeError(KnowiError):
    pass


class KnowiUnprocessableEntityError(KnowiError):
    pass


class KnowiInternalServiceError(KnowiError):
    pass


ERROR_CODE_EXCEPTION_MAPPING = {
    400: KnowiBadRequestError,
    401: KnowiUnauthorizedError,
    402: KnowiPaymentRequiredError,
    403: KnowiForbiddenError,
    404: KnowiNotFoundError,
    405: KnowiMethodNotAllowedError,
    406: KnowiNotAcceptableError,
    408: KnowiRequestTimeoutError,
    409: KnowiUserConflictError,
    415: KnowiUnsupportedMediaTypeError,
    422: KnowiUnprocessableEntityError,
    423: KnowiScrollExistsError,
    500: KnowiInternalServiceError,
}


def get_exception_for_error_code(error_code, knowi_error_code):
    if knowi_error_code == "scroll_exists":
        error_code = 423
    return ERROR_CODE_EXCEPTION_MAPPING.get(error_code, KnowiError)


def raise_for_error(response, logger):
    try:
        response.raise_for_status()
    except (requests.HTTPError, requests.ConnectionError) as error:
        try:
            content_length = len(response.content)
            if content_length == 0:
                # There is nothing we can do here since Knowi has neither sent
                # us a 2xx response nor a response content.
                return
            response_json = response.json()
            status_code = response.status_code
            logger.error("RESPONSE: {}".format(response_json))
            if response_json.get("type") == "error.list":
                message = ""
                for err in response_json["errors"]:
                    error_message = err.get("message")
                    error_code = err.get("code")
                    ex = get_exception_for_error_code(
                        error_code=status_code, Knowi_error_code=error_code
                    )
                    if status_code == 401 and "access_token" in error_code:
                        logger.error(
                            "Your API access_token is expired/invalid as per Knowi's"
                            "security policy. \n Please re-authenticate your connection to "
                            "generate a new access_token and resume extraction."
                        )
                    message = "{}: {}\n{}".format(error_code, error_message, message)
                raise ex("{}".format(message)) from error
            raise KnowiError(error) from error
        except (ValueError, TypeError) as inner_error:
            raise KnowiError(error) from inner_error


class KnowiClient(object):
    def __init__(
        self,
        logger,
        access_token,
        config_request_timeout,  # request_timeout parameter
        user_agent=None,
    ):
        self.__access_token = access_token
        self.__user_agent = user_agent
        # Rate limit initial values, reset by check_access_token headers
        self.__session = requests.Session()
        self.__verified = False
        self.base_url = "https://knowi.com/api/1.0"
        self.logger = logger

        # Set request timeout to config param `request_timeout` value.
        # If value is 0,"0","" or not passed then it set default to 300 seconds.
        if config_request_timeout and float(config_request_timeout):
            self.__request_timeout = float(config_request_timeout)
        else:
            self.__request_timeout = REQUEST_TIMEOUT

    # `check_access_token` may throw timeout error. `request` method also call `check_access_token`.
    # So, to add backoff over `check_access_token` may cause 5*5 = 25 times backoff which
    # is not expected. That's why added backoff here.
    def __enter__(self):
        self.__verified = self.check_access_token()
        return self

    def __exit__(self, exception_type, exception_value, traceback):
        self.__session.close()

    @utils.ratelimit(1000, 60)
    def check_access_token(self):
        if self.__access_token is None:
            raise Exception("Error: Missing access_token.")
        headers = {}
        if self.__user_agent:
            headers["User-Agent"] = self.__user_agent

        headers["Authorization"] = "Bearer {}".format(self.__access_token)
        headers["Accept"] = "application/json"
        response = self.__session.get(
            # Simple endpoint that returns 1 Account record (to check API/access_token access):
            url="{}/{}".format(self.base_url, "dashboards"),
            timeout=self.__request_timeout,  # Pass request timeout
            headers=headers,
        )
        if response.status_code != 200:
            self.logger.error("Error status_code = {}".format(response.status_code))
            raise_for_error(response, self.logger)
        else:
            resp = response.json()
            if "list" in resp:
                return True
            return False

    @utils.ratelimit(1000, 60)
    def request(self, method, path=None, url=None, **kwargs):
        if not self.__verified:
            self.__verified = self.check_access_token()

        if not url and path:
            url = "{}/{}".format(self.base_url, path)

        self.logger.info(
            "URL: {} {}, Params: {}, JSON Body: {}".format(
                method,
                url,
                kwargs.get("params"),
                kwargs.get("json"),
            )
        )

        if "endpoint" in kwargs:
            endpoint = kwargs["endpoint"]
            del kwargs["endpoint"]
        else:
            endpoint = None

        if "headers" not in kwargs:
            kwargs["headers"] = {}

        kwargs["headers"]["Authorization"] = "Bearer {}".format(self.__access_token)
        kwargs["headers"]["Accept"] = "application/json"

        if self.__user_agent:
            kwargs["headers"]["User-Agent"] = self.__user_agent

        if method == "POST":
            kwargs["headers"]["Content-Type"] = "application/json"

        with metrics.http_request_timer(endpoint) as timer:
            response = self.__session.request(
                method, url, timeout=self.__request_timeout, **kwargs
            )
            timer.tags[metrics.Tag.http_status_code] = response.status_code

        if response.status_code >= 500:
            raise Server5xxError()

        if response.status_code != 200:
            raise_for_error(response, self.logger)

        return response.json()

    def get(self, path, **kwargs):
        self.logger.info(f"Get request with the path: {path}")
        return self.request("GET", path=path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path=path, **kwargs)

    def perform(self, method, path, **kwargs):
        if method == "POST":
            return self.post(path, **kwargs)
        return self.get(path, **kwargs)
