from typing import Dict

from mage_ai.errors.constants import ErrorCode
from mage_ai.errors.models import ErrorDetails


class ApiError(Exception):
    UNAUTHORIZED_ACCESS = {
        'code': ErrorCode.CODE_403,
        'message': 'Unauthorized access.',
        'type': 'unauthorized_access',
    }

    RESOURCE_ERROR = {
        'code': ErrorCode.CODE_500,
        'message': 'API resource error.',
        'type': 'api_resource_error',
    }
    RESOURCE_INVALID = {
        'code': ErrorCode.CODE_402,
        'message': 'Record is invalid.',
        'type': 'record_invalid',
    }
    RESOURCE_NOT_FOUND = {
        'code': ErrorCode.CODE_404,
        'message': 'Record not found.',
        'type': 'record_not_found',
    }

    INVALID_API_KEY = {
        'code': ErrorCode.CODE_403,
        'message': 'Invalid API key.',
        'type': 'invalid_api_key',
    }
    EXPIRED_OAUTH_TOKEN = {
        'code': ErrorCode.CODE_401,
        'message': 'Expired OAuth token.',
        'type': 'expired_oauth_token',
    }
    INVALID_OAUTH_TOKEN = {
        'code': ErrorCode.CODE_401,
        'message': 'Invalid OAuth token.',
        'type': 'invalid_oauth_token',
    }

    def __init__(self, opts: Dict = None):
        if opts:
            self.code = opts.get('code')
            self.errors = opts.get('errors')
            self.message = opts.get('message')
            self.type = opts.get('type')

    def to_dict(self, **kwargs) -> Dict:
        errors = self.errors
        if not isinstance(errors, list):
            errors = str(errors).split('\n')

        return ErrorDetails.load(
            code=self.code,
            errors=errors,
            message=self.message,
            type=self.type,
        ).to_dict()
