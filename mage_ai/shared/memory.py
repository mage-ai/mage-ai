import json
import os
from logging import Logger
from typing import Any, Callable, Dict

import psutil

from mage_ai.data_preparation.logging.logger import DictLogger


def __log(log_message: str, logger: Logger = None, logging_tags: Dict = None):
    if logger:
        if isinstance(logger, DictLogger):
            logger.info(log_message, tags=logging_tags)
        else:
            logger.info(log_message)
            if logging_tags:
                logger.info(json.dumps(logging_tags, indent=2))
    else:
        print(log_message)
        if logging_tags:
            print(json.dumps(logging_tags, indent=2))


def get_memory_usage(
    log: bool = True,
    logger: Logger = None,
    logging_tags: Dict = None,
    message_prefix: str = None,
    wrapped_function: Callable = None,
) -> Any:
    process = psutil.Process(os.getpid())
    value = process.memory_info().rss

    if log or logger:
        message = (
            f'{message_prefix + " " if message_prefix else ""}'
            f'Memory usage: {value / (1024 * 1024)} MB'
        )
        __log(message, logger=logger, logging_tags=logging_tags)

    if wrapped_function:
        result = wrapped_function()

        value_after = process.memory_info().rss
        if log or logger:
            message = (
                f'{message_prefix + " " if message_prefix else ""}'
                f'Memory usage after function: {value_after / (1024 * 1024)} MB '
                f'(added {(value_after - value) / (1024 * 1024)} MB)'
            )
            __log(message, logger=logger, logging_tags=logging_tags)

        return result

    return value


async def get_memory_usage_async(
    log: bool = True,
    logger: Logger = None,
    logging_tags: Dict = None,
    message_prefix: str = None,
    wrapped_function: Callable = None,
) -> Any:
    process = psutil.Process(os.getpid())
    value = process.memory_info().rss

    if log or logger:
        message = (
            f'{message_prefix + " " if message_prefix else ""}'
            f'Memory usage: {value / (1024 * 1024)} MB'
        )
        __log(message, logger=logger, logging_tags=logging_tags)

    if wrapped_function:
        result = await wrapped_function()

        value_after = process.memory_info().rss
        if log or logger:
            message = (
                f'{message_prefix + " " if message_prefix else ""}'
                f'Memory usage after function: {value_after / (1024 * 1024)} MB '
                f'(added {(value_after - value) / (1024 * 1024)} MB)'
            )
            __log(message, logger=logger, logging_tags=logging_tags)

        return result

    return value
