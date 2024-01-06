import os
from typing import Dict

import simplejson
from sqlalchemy.orm import Query, Session

from mage_ai.shared.environments import is_debug


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
