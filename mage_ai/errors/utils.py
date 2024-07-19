import sys
import traceback
from typing import Dict


def filter_traceback(stacktrace, code_filename='<string>'):
    filtered_stacktrace = []
    for line in stacktrace:
        if code_filename in line:
            filtered_stacktrace.append(line)
    return filtered_stacktrace


def serialize_error(error: Exception) -> Dict:
    exc_type, exc_value, exc_tb = sys.exc_info()

    # Capture the full traceback (all frames leading to the error)
    stacktrace = traceback.format_exception(exc_type, exc_value, exc_tb)
    message = repr(error)
    stacktrace_formatted, message_formatted = format_and_colorize_stacktrace(stacktrace, message)

    return dict(
        error=error,
        message=message,
        message_formatted=message_formatted,
        stacktrace=stacktrace,
        stacktrace_formatted=stacktrace_formatted,
        type=exc_type.__name__ if exc_type else None,
    )


def format_and_colorize_stacktrace(stacktrace, message):
    # Define colors
    red = '\033[91m'
    green = '\033[92m'
    yellow = '\033[93m'
    cyan = '\033[96m'
    bright_black = '\033[90m'
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
