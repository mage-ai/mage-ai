"""Bound the blocking filesystem and JSON work done by the Files API."""

import asyncio
import contextvars
from concurrent.futures import ThreadPoolExecutor
from functools import partial


_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix='mage-files')


async def run_file_work(func, *args, **kwargs):
    loop = asyncio.get_running_loop()
    context = contextvars.copy_context()
    return await loop.run_in_executor(_executor, partial(context.run, func, *args, **kwargs))
