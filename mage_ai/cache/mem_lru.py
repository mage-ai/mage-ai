import copy
import os
import sys
import traceback
from datetime import datetime

import aiofiles
from cachetools import LRUCache

from mage_ai.shared.yaml import load_yaml


class MemorySizeLRUCache(LRUCache):
    def __init__(
        self,
        maxsize: int = 1000,
        max_memory_size: int = 100 * 1024 * 1024,
    ):
        super().__init__(maxsize=maxsize)
        self.max_memory_size = max_memory_size
        self.current_memory_size = 0

    def __setitem__(self, key, value):
        size = self._get_size(value)
        if size > self.max_memory_size:
            raise ValueError('Item size exceeds cache maximum memory size')

        while self.current_memory_size + size > self.max_memory_size:
            self.popitem()

        self.current_memory_size += size
        super().__setitem__(key, value)

    def __delitem__(self, key):
        value = self[key]
        self.current_memory_size -= self._get_size(value)
        super().__delitem__(key)

    def _get_size(self, value):
        return sys.getsizeof(value['content'])


def cache_file_read(cache):
    def decorator(func):
        def wrapper(file_path, *args, **kwargs):
            if not os.path.exists(file_path):
                return None

            file_updated_at = datetime.fromtimestamp(
                os.path.getmtime(file_path),
                tz=datetime.utcnow().astimezone().tzinfo,
            )

            if file_path in cache:
                cache_entry = cache[file_path]
                cached_updated_at = cache_entry.get('updated_at')
                if cached_updated_at >= file_updated_at:
                    # print(f'cache hit {file_path} {cached_updated_at} {file_updated_at}')
                    return copy.deepcopy(cache_entry['content'])
                # else:
                #     print(f'cache miss {file_path} {cached_updated_at} {file_updated_at}')

            # print(f'cache new item {file_path}')
            try:
                content = func(file_path, *args, **kwargs)
                cache[file_path] = {
                    'content': content,
                    'updated_at': file_updated_at,
                }
                return copy.deepcopy(content)
            except Exception:
                traceback.print_exc()
                return None
        return wrapper
    return decorator


def async_cache_file_read(cache):
    def decorator(func):
        async def wrapper(file_path, *args, **kwargs):
            if not os.path.exists(file_path):
                return None

            file_updated_at = datetime.fromtimestamp(
                os.path.getmtime(file_path),
                tz=datetime.utcnow().astimezone().tzinfo,
            )

            if file_path in cache:
                cache_entry = cache[file_path]
                cached_updated_at = cache_entry.get('updated_at')
                if cached_updated_at >= file_updated_at:
                    # print(f'async cache hit {file_path} {cached_updated_at} {file_updated_at}')
                    return copy.deepcopy(cache_entry['content'])
                # else:
                #     print(f'async cache miss {file_path} {cached_updated_at} {file_updated_at}')

            # print(f'async cache new item {file_path}')
            try:
                content = await func(file_path, *args, **kwargs)
                cache[file_path] = {
                    'content': content,
                    'updated_at': file_updated_at,
                }
                return copy.deepcopy(content)
            except Exception:
                traceback.print_exc()
                return None
        return wrapper
    return decorator


file_cache = MemorySizeLRUCache()


@cache_file_read(file_cache)
def read_yaml_file(file_path, mode: str = 'r', **kwargs):
    with open(file_path, mode, **kwargs) as file:
        return load_yaml(file.read()) or {}


@async_cache_file_read(file_cache)
async def read_yaml_file_async(file_path, mode: str = 'r', **kwargs):
    async with aiofiles.open(file_path, mode, **kwargs) as file:
        return load_yaml(await file.read()) or {}
