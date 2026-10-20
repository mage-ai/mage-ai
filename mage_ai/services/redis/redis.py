import traceback

import redis


def init_redis_client(redis_url):
    if not redis_url:
        return None
    try:
        redis_client = redis.Redis.from_url(url=redis_url, decode_responses=True)
        redis_client.ping()
    except Exception:
        traceback.print_exc()
        redis_client = None
    return redis_client
