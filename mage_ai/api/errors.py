class ApiError(Exception):
    UNAUTHORIZED_ACCESS = {
        'code': 403,
        'message': 'Unauthorized access.',
        'type': 'unauthorized_access',
    }

    RESOURCE_ERROR = {
        'code': 500,
        'message': 'API resource error.',
        'type': 'api_resource_error',
    }
    RESOURCE_INVALID = {
        'code': 402,
        'message': 'Record is invalid.',
        'type': 'record_invalid',
    }
    RESOURCE_NOT_FOUND = {
        'code': 404,
        'message': 'Record not found.',
        'type': 'record_not_found',
    }

    INVALID_API_KEY = {
        'code': 403,
        'message': 'Invalid API key.',
        'type': 'invalid_api_key',
    }
    EXPIRED_OAUTH_TOKEN = {
        'code': 401,
        'message': 'Expired OAuth token.',
        'type': 'expired_oauth_token',
    }
    INVALID_OAUTH_TOKEN = {
        'code': 401,
        'message': 'Invalid OAuth token.',
        'type': 'invalid_oauth_token',
    }

    def __init__(self, opts={}):
        self.code = opts.get('code')
        self.errors = opts.get('errors')
        self.message = opts.get('message')
        self.type = opts.get('type')
