from singer import get_logger

LOGGER = get_logger()


class TwitterAdsClientError(Exception):
    pass


class TwitterAdsBadRequestError(TwitterAdsClientError):
    pass


class TwitterAdsUnauthorizedError(TwitterAdsClientError):
    pass


class TwitterAdsForbiddenError(TwitterAdsClientError):
    pass


class TwitterAdsNotFoundError(TwitterAdsClientError):
    pass


class TwitterAdsMethodNotFoundError(TwitterAdsClientError):
    pass


class TwitterAdsClient429Error(TwitterAdsClientError):
    pass


class TwitterAdsRequestCancelledError(TwitterAdsClientError):
    pass


class TwitterAdsInternalServerError(TwitterAdsClientError):
    pass


class TwitterAdsServiceUnavailableError(TwitterAdsClientError):
    pass


ERROR_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": TwitterAdsBadRequestError,
        "message": "The request is missing or has a bad parameter."
    },
    401: {
        "raise_exception": TwitterAdsUnauthorizedError,
        "message": "Unauthorized access for the URL."
    },
    403: {
        "raise_exception": TwitterAdsForbiddenError,
        "message": "User does not have permission to access the resource."
    },
    404: {
        "raise_exception": TwitterAdsNotFoundError,
        "message": "The resource you have specified cannot be found."
    },
    405: {
        "raise_exception": TwitterAdsMethodNotFoundError,
        "message": "The provided HTTP method is not supported by the URL."
    },
    408: {
        "raise_exception": TwitterAdsRequestCancelledError,
        "message": "Request is cancelled."
    },
    429: {
        "raise_exception": TwitterAdsClient429Error,
        "message": "API rate limit exceeded, please retry after some time."
    },
    500: {
        "raise_exception": TwitterAdsInternalServerError,
        "message": "Internal error."
    },
    503: {
        "raise_exception": TwitterAdsServiceUnavailableError,
        "message": "Service is unavailable."
    }
}


# get exception class based on status code
def get_exception_for_status_code(status_code):
    # if status code is not in above ERROR_CODE_EXCEPTION_MAPPING then 
    # return defult class TwitterAdsClinetError
    return ERROR_CODE_EXCEPTION_MAPPING.get(status_code, {}).get("raise_exception", TwitterAdsClientError)


# raise error with proper message based in error code from the response
def raise_for_error(exception):
    status_code = exception.code

    if exception.details:
        error_message = exception.details[0].get("message", ERROR_CODE_EXCEPTION_MAPPING.get(status_code, {}).get("message", "Unknown Error"))  
    else: 
        error_message = ERROR_CODE_EXCEPTION_MAPPING.get(status_code, {}).get("message", "Unknown Error")

    # get twitter-ads error code, message and prepare message
    message = "HTTP-error-code: {}, Message: {}".format(status_code, error_message)

    # get exception class
    exception = get_exception_for_status_code(status_code)

    raise exception(message) from None
