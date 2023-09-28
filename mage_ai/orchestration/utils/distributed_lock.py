from mage_ai.services.redis.redis import init_redis_client
from mage_ai.settings import REDIS_URL


class DistributedLock:
    def __init__(
        self,
        lock_key_prefix='LOCK_KEY',
        lock_timeout=30,
    ):
        self.lock_key_prefix = lock_key_prefix
        self.lock_timeout = lock_timeout
        self.redis_client = init_redis_client(REDIS_URL)

    def __lock_key(self, key) -> str:
        return f'{self.lock_key_prefix}_{key}'

    def try_acquire_lock(self, key, timeout: int = None) -> bool:
        if not self.redis_client:
            return True
        # Try to acquire the lock by setting the lock key with a value and an expiration time
        acquired = self.redis_client.set(
            self.__lock_key(key),
            '1',
            nx=True,
            ex=timeout or self.lock_timeout,
        )
        return acquired is True

    def release_lock(self, key):
        # Release the lock by deleting the lock key
        if self.redis_client:
            self.redis_client.delete(self.__lock_key(key))
