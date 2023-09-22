import requests
from singer import metrics, utils

REQUEST_TIMEOUT = 300


class Server5xxError(Exception):
    pass


class Server429Error(Exception):
    pass


class TableauError(Exception):
    pass


class TableauBadRequestError(TableauError):
    pass


class TableauScrollExistsError(TableauError):
    pass


class TableauUnauthorizedError(TableauError):
    pass


class TableauPaymentRequiredError(TableauError):
    pass


class TableauForbiddenError(TableauError):
    pass


class TableauNotFoundError(TableauError):
    pass


class TableauMethodNotAllowedError(TableauError):
    pass


class TableauNotAcceptableError(TableauError):
    pass


class TableauRequestTimeoutError(TableauError):
    pass


class TableauConflictError(TableauError):
    pass


class TableauUserConflictError(TableauError):
    pass


class TableauUnsupportedMediaTypeError(TableauError):
    pass


class TableauUnprocessableEntityError(TableauError):
    pass


class TableauInternalServiceError(TableauError):
    pass


ERROR_CODE_EXCEPTION_MAPPING = {
    400: TableauBadRequestError,
    401: TableauUnauthorizedError,
    402: TableauPaymentRequiredError,
    403: TableauForbiddenError,
    404: TableauNotFoundError,
    405: TableauMethodNotAllowedError,
    406: TableauNotAcceptableError,
    408: TableauRequestTimeoutError,
    409: TableauUserConflictError,
    415: TableauUnsupportedMediaTypeError,
    422: TableauUnprocessableEntityError,
    423: TableauScrollExistsError,
    500: TableauInternalServiceError,
}


def get_exception_for_error_code(error_code, tableau_error_code):
    if tableau_error_code == "scroll_exists":
        error_code = 423
    return ERROR_CODE_EXCEPTION_MAPPING.get(error_code, TableauError)


def raise_for_error(response, logger):
    try:
        response.raise_for_status()
    except (requests.HTTPError, requests.ConnectionError) as error:
        try:
            content_length = len(response.content)
            if content_length == 0:
                # There is nothing we can do here since Tableau has neither sent
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
                        error_code=status_code, Tableau_error_code=error_code
                    )
                    if status_code == 401 and "access_token" in error_code:
                        logger.error(
                            "Your API access_token is expired/invalid as per Tableau's"
                            "security policy. \n Please re-authenticate your connection to "
                            "generate a new access_token and resume extraction."
                        )
                    message = "{}: {}\n{}".format(error_code, error_message, message)
                raise ex("{}".format(message)) from error
            raise TableauError(error) from error
        except (ValueError, TypeError) as inner_error:
            raise TableauError(error) from inner_error


class TableauClient(object):
    def __init__(
        self,
        logger,
        access_token,
        base_url,
        config_request_timeout,  # request_timeout parameter
        user_agent=None,
    ):
        self.__access_token = access_token
        self.__user_agent = user_agent
        # Rate limit initial values, reset by check_access_token headers
        self.__session = requests.Session()
        self.__verified = False
        self.base_url = base_url
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

        headers["X-Tableau-Auth"] = "{}".format(self.__access_token)
        headers["Accept"] = "application/json"
        headers["Content-Type"] = "application/json"
        response = self.__session.get(
            # Simple endpoint that returns 1 Account record (to check API/access_token access):
            url="{}/{}".format(self.base_url, "workbooks"),
            timeout=self.__request_timeout,  # Pass request timeout
            headers=headers,
        )
        if response.status_code != 200:
            self.logger.error("Error status_code = {}".format(response.status_code))
            raise_for_error(response, self.logger)
        else:
            resp = response.json()
            if "workbooks" in resp:
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

        kwargs["headers"]["X-Tableau-Auth"] = "{}".format(self.__access_token)
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
