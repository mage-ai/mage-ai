import gc
import tracemalloc
from contextlib import asynccontextmanager, contextmanager
from logging import Logger
from typing import Any, Callable, Dict, List, Optional, Tuple

from mage_ai.settings.server import DEBUG_MEMORY, MEMORY_MANAGER_V2
from mage_ai.shared.environments import is_debug
from mage_ai.system.memory.utils import (
    get_memory_usage,
    get_memory_usage_async,
    log_or_print,
)
from mage_ai.system.models import ResourceUsage


@asynccontextmanager
async def scoped_function_execution_async(
    detailed_logging: bool = False,
    log_message_prefix: Optional[str] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
):
    before = None
    snapshot1 = None
    if detailed_logging:
        tracemalloc.start()
        snapshot1 = tracemalloc.take_snapshot()

        gc.collect()  # Clean up any collectable objects
        before = len(gc.get_objects())  # Number of objects before the function call

    try:
        yield
    finally:
        if detailed_logging and snapshot1:
            snapshot2 = tracemalloc.take_snapshot()
            top_stats = snapshot2.compare_to(snapshot1, 'lineno')
            for stat in top_stats[:10]:
                log_or_print(
                    str(stat),
                    logger=logger,
                    logging_tags=logging_tags,
                    message_prefix=log_message_prefix,
                )

        gc.collect()

        if detailed_logging:
            after = len(gc.get_objects())  # Number of objects after the function call

            if before is not None and after is not None:
                log_or_print(
                    f'Objects before: {before}, after: {after}, difference: {after - before}',
                    logger=logger,
                    logging_tags=logging_tags,
                    message_prefix=log_message_prefix,
                )


@contextmanager
def scoped_function_execution(
    detailed_logging: bool = False,
    log_message_prefix: Optional[str] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
):
    before = None
    snapshot1 = None
    if detailed_logging:
        tracemalloc.start()
        snapshot1 = tracemalloc.take_snapshot()

        gc.collect()  # Clean up any collectable objects
        before = len(gc.get_objects())  # Number of objects before the function call

    try:
        yield
    finally:
        if detailed_logging and snapshot1:
            snapshot2 = tracemalloc.take_snapshot()
            top_stats = snapshot2.compare_to(snapshot1, 'lineno')
            for stat in top_stats[:10]:
                log_or_print(
                    str(stat),
                    logger=logger,
                    logging_tags=logging_tags,
                    message_prefix=log_message_prefix,
                )

        gc.collect()

        if detailed_logging:
            after = len(gc.get_objects())  # Number of objects after the function call

            if before is not None and after is not None:
                log_or_print(
                    f'Objects before: {before}, after: {after}, difference: {after - before}',
                    logger=logger,
                    logging_tags=logging_tags,
                    message_prefix=log_message_prefix,
                )


def execute_with_memory_tracking(
    func: Callable[..., Any],
    args: Optional[List[Any]] = None,
    kwargs: Optional[Dict[str, Any]] = None,
    log_message_prefix: Optional[str] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
) -> Tuple[Optional[Any], ResourceUsage]:
    def function_with_params(args=args, func=func, kwargs=kwargs):
        if args is not None and kwargs is not None:
            return func(*args, **kwargs)
        elif args is not None:
            return func(*args)
        elif kwargs is not None:
            return func(**kwargs)
        else:
            return func()

    # Wrap the actual function call with memory tracking
    def wrapped_function():
        with scoped_function_execution(
            detailed_logging=is_debug(),
            log_message_prefix=log_message_prefix,
            logger=logger,
            logging_tags=logging_tags,
        ):
            return function_with_params()

    if MEMORY_MANAGER_V2:
        # Pass the wrapped function to get_memory_usage for execution and memory tracking
        result, resource_usage = get_memory_usage(
            wrapped_function=wrapped_function,
            log=DEBUG_MEMORY,
            message_prefix=log_message_prefix,
        )

        return result, resource_usage
    return function_with_params(), ResourceUsage()


async def execute_with_memory_tracking_async(
    func: Callable[..., Any],
    args: Optional[List[Any]] = None,
    kwargs: Optional[Dict[str, Any]] = None,
    log_message_prefix: Optional[str] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
) -> Tuple[Optional[Any], ResourceUsage]:
    # Wrap the actual function call with memory tracking
    async def wrapped_function_async():
        async with scoped_function_execution_async(
            detailed_logging=is_debug(),
            log_message_prefix=log_message_prefix,
            logger=logger,
            logging_tags=logging_tags,
        ):
            if args is not None and kwargs is not None:
                return await func(*args, **kwargs)
            elif args is not None:
                return await func(*args)
            elif kwargs is not None:
                return await func(**kwargs)
            else:
                return await func()

    # Pass the wrapped function to get_memory_usage for execution and memory tracking
    result, resource_usage = await get_memory_usage_async(
        wrapped_function=wrapped_function_async,
        log=DEBUG_MEMORY,
        message_prefix=log_message_prefix,
    )

    return result, resource_usage
