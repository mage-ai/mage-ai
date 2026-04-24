import os
from typing import Dict

import simplejson
from sqlalchemy.orm import Query, Session
from sqlalchemy.sql.compiler import Compiled

from mage_ai.shared.environments import is_debug

try:
    from sqlalchemy.sql import Executable  # SQLAlchemy 2.x
except ImportError:
    from sqlalchemy.sql.base import Executable  # SQLAlchemy 1.x


class CachingQuery(Query):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache = False
        self.cache_key = None

    def all(self, *args, **kwargs):
        from mage_ai.shared.parsers import encode_complex

        debug = is_debug()

        if self.cache:
            if not self.cache_key:
                compiler = self.statement.compile()

                cache_key_1 = compiler.string
                cache_key_2 = simplejson.dumps(
                    compiler.params or {},
                    default=encode_complex,
                    ignore_nan=True,
                )
                self.cache_key = str(hash(f'{cache_key_1}:{cache_key_2}'))

            if debug and not os.getenv('DISABLE_DATABASE_TERMINAL_OUTPUT'):
                keys_count = len((self.session.cache() or {}).keys())
                print(f'[INFO] Number of keys in session cache: {keys_count}')

            results = self.session.get_results_from_cache(self.cache_key)
            if self.cache_key and results:
                if debug and not os.getenv('DISABLE_DATABASE_TERMINAL_OUTPUT'):
                    print(f'[INFO] Cache HIT for cache key: {self.cache_key}')

                return results

        results = super().all(*args, **kwargs)

        if self.cache and self.cache_key:
            if debug and not os.getenv('DISABLE_DATABASE_TERMINAL_OUTPUT'):
                print(f'[INFO] Cache MISS for cache key: {self.cache_key}')
            self.session.cache_results(self.cache_key, results)

        return results


class SessionWithCaching(Session):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._cache = None
        self._cache_initialized = False

    def cache(self) -> Dict:
        if self._cache_initialized:
            return self._cache

    def get_results_from_cache(self, cache_key):
        return (self.cache() or {}).get(cache_key)

    def cache_results(self, cache_key, results):
        if self._cache_initialized:
            self._cache[cache_key] = results

    def start_cache(self) -> None:
        self._cache = {}
        self._cache_initialized = True

    def stop_cache(self) -> None:
        self._cache = None
        self._cache_initialized = False

    def execute_with_cache(
        self,
        statement: Executable,
        cache: bool = False,
        result_type: str = 'scalars',  # options: 'scalars', 'all', 'fetchall'
        **kwargs,
    ):
        """
        Executes a SQLAlchemy statement with optional result caching and flexible result types.

        Args:
            statement: The SQLAlchemy Core or ORM statement to execute
                (e.g., select(User), text(...)).
            cache (bool): Whether to enable in-memory caching for the result. Default is False.
            result_type (str): Type of result processing to apply. Must be one of:
                - 'scalars': Calls `result.scalars().all()`, returns a flat list of values.
                - 'all': Calls `result.all()`, returns a list of ORM objects or row tuples.
                - 'fetchall': Calls `result.fetchall()`, returns raw DB-API row tuples.
            **kwargs: Additional arguments passed to the `Session.execute()` method.

        Returns:
            list: Query result based on the specified `result_type`.

        Raises:
            ValueError: If an unsupported `result_type` is provided.

        Notes:
            - Caching uses a hashed key based on the compiled SQL string and parameters.
            - Cache is session-local and must be enabled using `start_cache()` before use.
            - This method supports both SQLAlchemy 1.4 and 2.x syntax and behavior.
        """

        from mage_ai.shared.parsers import encode_complex

        debug = is_debug()
        cache_key = None

        if cache:
            compiler: Compiled = statement.compile(self.get_bind())
            cache_key_1 = compiler.string
            cache_key_2 = simplejson.dumps(
                compiler.params or {},
                default=encode_complex,
                ignore_nan=True,
            )
            cache_key = str(hash(f"{cache_key_1}:{cache_key_2}"))

            if debug and not os.getenv("DISABLE_DATABASE_TERMINAL_OUTPUT"):
                keys_count = len((self.cache() or {}).keys())
                print(f"[INFO] Number of keys in session cache: {keys_count}")

            cached_result = self.get_results_from_cache(cache_key)
            if cached_result is not None:
                if debug and not os.getenv("DISABLE_DATABASE_TERMINAL_OUTPUT"):
                    print(f"[INFO] Cache HIT for cache key: {cache_key}")
                return cached_result

        result = super().execute(statement, **kwargs)
        if result_type == 'scalars':
            data = result.scalars().all()
        elif result_type == 'all':
            data = result.all()
        elif result_type == 'fetchall':
            data = result.fetchall()
        else:
            raise ValueError(f"Unsupported result_type: {result_type}")

        if cache and cache_key:
            if debug and not os.getenv("DISABLE_DATABASE_TERMINAL_OUTPUT"):
                print(f"[INFO] Cache MISS for cache key: {cache_key}")
            self.cache_results(cache_key, data)

        return data
