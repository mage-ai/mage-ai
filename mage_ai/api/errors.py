from typing import Dict, Optional

from mage_ai.errors.constants import ErrorCode
from mage_ai.errors.models import ErrorDetails


class ApiError(Exception):
    UNAUTHORIZED_ACCESS = dict(
        code=ErrorCode.CODE_403.value,
        message='Unauthorized access.',
        type='unauthorized_access',
    )

    RESOURCE_ERROR = dict(
        code=ErrorCode.CODE_400.value,
        message='API resource error.',
        type='api_resource_error',
    )
    RESOURCE_INVALID = dict(
        code=ErrorCode.CODE_400.value,
        message='Record is invalid.',
        type='record_invalid',
    )
    RESOURCE_NOT_FOUND = dict(
        code=ErrorCode.CODE_404.value,
        message='Record not found.',
        type='record_not_found',
    )

    INVALID_API_KEY = dict(
        code=ErrorCode.CODE_401.value,
        message='Invalid API key.',
        type='invalid_api_key',
    )
    EXPIRED_OAUTH_TOKEN = dict(
        code=ErrorCode.CODE_401.value,
        message='Expired OAuth token.',
        type='expired_oauth_token',
    )
    INVALID_OAUTH_TOKEN = dict(
        code=ErrorCode.CODE_401.value,
        message='Invalid OAuth token.',
        type='invalid_oauth_token',
    )
    INTERNAL_SERVER_ERROR = dict(
        code=ErrorCode.CODE_500.value,
        message='Internal server error.',
        type='internal_server_error',
    )

    def __init__(self, opts: Optional[Dict] = None):
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


def format_and_colorize_stacktrace(stacktrace, message):
    # Define colors
    red = '\033[91m'
    green = '\033[92m'
    yellow = '\033[93m'
    # blue = '\033[94m'
    # magenta = '\033[95m'
    cyan = '\033[96m'
    bright_black = '\033[90m'
    bold = '\033[1m'
    # underline = '\033[4m'
    reset = '\033[0m'
    error_msg_color = '\033[91m'

    formatted_lines = []

    for line in stacktrace:
        if 'File "' in line and 'line' in line:
            parts = line.split(", ")
            filename_part = parts[0]
            line_number_part = parts[1]
            rest = ", ".join(parts[2:])

            formatted_line = (
                f"{green}{filename_part}{reset}, {yellow}{line_number_part}{reset}, "
                f"{cyan}{rest}{reset}"
            )
            formatted_lines.append(formatted_line)
        elif line.startswith('Traceback'):
            formatted_lines.append(f"{red}{line}{reset}")
        elif 'Exception occurred' in line:
            formatted_lines.append(f"{bold}{red}{line}{reset}")
        else:
            formatted_lines.append(f"{bright_black}{line}{reset}")

    formatted_message = f"{error_msg_color}{message}{reset}" if message else ""

    return formatted_lines, formatted_message
