

class PipedriveError(Exception):
    def __init__(self, message=None, response=None):
        super().__init__(message)
        self.message = message
        self.response = response

class PipedriveNotFoundError(PipedriveError):
    pass

class PipedriveBadRequestError(PipedriveError):
    pass

class PipedriveUnauthorizedError(PipedriveError):
    pass

class PipedrivePaymentRequiredError(PipedriveError):
    pass

class PipedriveForbiddenError(PipedriveError):
    pass

class PipedriveGoneError(PipedriveError):
    pass

class PipedriveUnsupportedMediaError(PipedriveError):
    pass

class PipedriveUnprocessableEntityError(PipedriveError):
    pass

class PipedriveTooManyRequestsError(PipedriveError):
    pass

class PipedriveTooManyRequestsInSecondError(PipedriveError):
    pass

class PipedriveInternalServiceError(PipedriveError):
    pass

class PipedriveNotImplementedError(PipedriveError):
    pass

class PipedriveServiceUnavailableError(PipedriveError):
    pass
