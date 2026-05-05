import redis.asyncio as redis


class RedisService:
    def __init__(self, redis_url: str, ttl_seconds: int) -> None:
        self._redis = redis.from_url(redis_url, decode_responses=True)
        self._ttl_seconds = ttl_seconds

    async def set_status(self, task_id, status: str) -> None:
        await self._redis.set(
            f'task:{task_id}:status',
            status,
            ex=self._ttl_seconds,
        )
