import os
from logging import Logger
from typing import Callable

import psutil


def get_memory_usage(
    log: bool = True,
    logger: Logger = None,
    message_prefix: str = None,
    wrapped_function: Callable = None,
) -> float:
    process = psutil.Process(os.getpid())
    value = process.memory_info().rss

    if log or logger:
        message = (
            f'{message_prefix + " " if message_prefix else ""}'
            f'Memory usage: {value / (1024 * 1024)} MB'
        )
        if logger:
            logger.info(message)
        else:
            print(message)

    if wrapped_function:
        result = wrapped_function()

        value_after = process.memory_info().rss
        if log or logger:
            message = (
                f'{message_prefix + " " if message_prefix else ""}'
                f'Memory usage after function: {value_after / (1024 * 1024)} MB '
                f'(added {(value_after - value) / (1024 * 1024)} MB)'
            )
            if logger:
                logger.info(message)
            else:
                print(message)

        return result

    return value
