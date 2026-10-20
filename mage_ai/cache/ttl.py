from functools import wraps

import cachetools
from cachetools import TTLCache


def async_ttl_cache(maxsize=128, ttl=600):
    cache = TTLCache(maxsize=maxsize, ttl=ttl)

    def decorator(func):
        @wraps(func)
        async def wrapped(*args, **kwargs):
            key = cachetools.keys.hashkey(*args, **kwargs)
            if key in cache:
                return cache[key]
            result = await func(*args, **kwargs)
            cache[key] = result
            return result
        return wrapped
    return decorator
