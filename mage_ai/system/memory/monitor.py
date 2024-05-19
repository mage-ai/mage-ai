from typing import Any, Callable, Optional

from mage_ai.system.memory.utils import monitor_memory_usage, monitor_memory_usage_async


class MemoryMonitor:
    def __init__(self, poll_interval: float = 1.0):
        self.monitor_thread = None
        self.poll_interval = poll_interval
        self.stop_event = None

    def start_sync(self, callback: Optional[Callable[[float], Any]] = None) -> None:
        self.stop_event, self.monitor_thread = monitor_memory_usage(
            callback=callback,
            interval_seconds=self.poll_interval,
        )

    async def start_async(self, callback: Optional[Callable[[float], Any]] = None) -> None:
        self.stop_event, self.monitor_thread = await monitor_memory_usage_async(
            callback=callback,
            interval_seconds=self.poll_interval,
        )

    def stop(self) -> None:
        if self.stop_event:
            self.stop_event.set()
            self.stop_event = None
        if self.monitor_thread:
            self.monitor_thread.join()
            self.monitor_thread = None
