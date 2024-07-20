import sys
import traceback
from typing import Dict, Optional

USER_CODE_MARKER = '# __MAGER_CODE_MARKER__'


def format_and_colorize_stacktrace(stacktrace, message):
    # Define colors
    red = '\033[91m'
    green = '\033[92m'
    yellow = '\033[93m'
    # blue = '\033[34m'
    # magenta = '\033[35m'
    cyan = '\033[96m'
    bright_black = '\033[90m'
    # bright_red = '\033[91m'
    # bright_green = '\033[92m'
    # bright_yellow = '\033[93m'
    # bright_blue = '\033[94m'
    # bright_magenta = '\033[95m'
    # bright_cyan = '\033[96m'
    # bright_white = '\033[97m'
    bold = '\033[1m'
    reset = '\033[0m'
    error_msg_color = '\033[91m'

    formatted_lines = []

    for line in stacktrace:
        if 'File "' in line and 'line' in line:
            parts = line.split(', ')
            filename_part = parts[0]
            line_number_part = parts[1]
            rest = ', '.join(parts[2:])

            formatted_line = (
                f'{green}{filename_part}{reset}, {yellow}{line_number_part}{reset}, '
                f'{cyan}{rest}{reset}'
            )
            formatted_lines.append(formatted_line)
        elif line.startswith('Traceback'):
            formatted_lines.append(f'{red}{line}{reset}')
        elif 'Exception occurred' in line:
            formatted_lines.append(f'{bold}{red}{line}{reset}')
        else:
            formatted_lines.append(f'{bright_black}{line}{reset}')

    formatted_lines.append(f'{error_msg_color}{message}{reset}')

    return formatted_lines, message


def calculate_wrapper_offset(full_code: str, user_code_marker: str) -> int:
    lines = full_code.split('\n')
    for i, line in enumerate(lines):
        if user_code_marker in line:
            return i + 1  # The user code starts after this line
    return 0  # In case the marker is not found


def format_code_context(code_context, error_lineno):
    if not code_context:
        return []

    cyan = '\033[96m'
    red = '\033[91m'
    reset = '\033[0m'

    formatted_context = []
    for i, line in enumerate(code_context):
        line_number = error_lineno - len(code_context) // 2 + i
        prefix = f'{line_number:4}: '  # Line number prefix
        if line_number == error_lineno:
            formatted_context.append(f'{red}{prefix}{line}{reset}')
        else:
            formatted_context.append(f'{cyan}{prefix}{line}{reset}')

    return formatted_context


def serialize_error(
    error: Exception,
    full_code: Optional[str] = None,
    user_code_marker: Optional[str] = USER_CODE_MARKER,
) -> Dict:
    exc_type, exc_value, exc_tb = sys.exc_info()

    # Capture the full traceback (all frames leading to the error)
    stacktrace = traceback.format_exception(exc_type, exc_value, exc_tb)

    message = str(exc_value)  # This should give the actual error message.
    actual_error_message = f'{exc_type.__name__}: {message}'

    stacktrace_formatted, message_formatted = format_and_colorize_stacktrace(stacktrace, message)

    # Calculate the wrapper offset dynamically
    wrapper_code_offset = calculate_wrapper_offset(full_code, user_code_marker)

    code_context = None
    error_line = None

    if full_code and exc_tb:
        tb = traceback.extract_tb(exc_tb)
        last_frame = tb[-1]
        # Adjust the line number taking into consideration the dynamically calculated offset
        error_line = last_frame.lineno - wrapper_code_offset
        if error_line > 0:  # Ensure the adjusted line number points within the user code
            code_lines = full_code.split('\n')
            start_index = max(0, error_line - 3)  # 3 lines before the error line
            end_index = min(
                len(code_lines), error_line + 2
            )  # 2 lines after the error line, inclusive
            code_context = code_lines[start_index:end_index]

    return dict(
        code=full_code,
        code_context=code_context,
        code_context_formatted=format_code_context(code_context, error_line),
        error=error,
        exception=actual_error_message,
        line_number=error_line,
        message=message,
        message_formatted=message_formatted,
        stacktrace=stacktrace,
        stacktrace_formatted=stacktrace_formatted,
        type=exc_type.__name__ if exc_type else None,
    )
