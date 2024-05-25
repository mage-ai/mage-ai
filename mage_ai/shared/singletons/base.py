import asyncio
import threading
from functools import wraps


class SingletonBase:
    def __init__(self):
        self.value = None
        self._lock = asyncio.Lock()


class SingletonMeta(type):
    _instances = {}
    _lock: threading.Lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        with cls._lock:
            if cls not in cls._instances:
                instance = super().__call__(*args, **kwargs)
                cls._instances[cls] = instance
        return cls._instances[cls]


def singleton(cls):
    class Wrapper(cls, metaclass=SingletonMeta):
        __doc__ = cls.__doc__

    Wrapper.__name__ = cls.__name__
    return Wrapper


def synchronized_method(method):
    @wraps(method)
    def wrapper(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)

    return wrapper


def asynchronized_method(method):
    @wraps(method)
    async def wrapper(self, *args, **kwargs):
        async with self._lock:
            return method(self, *args, **kwargs)

    return wrapper
