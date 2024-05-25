from typing import Any, Optional

from mage_ai.shared.singletons.base import SingletonBase, singleton


@singleton
class MemoryManagerController(SingletonBase):
    def __init__(self):
        super().__init__()  # Ensures self._lock is initialized
        self.events = {}

    def add_event_monitor(self, key: str, stop_event, monitor_thread):
        self.stop_event(key)
        self.events[key] = (stop_event, monitor_thread)

    def stop_event(
        self, key, stop_event: Optional[Any] = None, monitor_thread: Optional[Any] = None
    ):
        if self.events.get(key):
            if not stop_event and not monitor_thread:
                stop_event, monitor_thread = self.events[key]

            if stop_event:
                stop_event.set()
                stop_event = None
            if monitor_thread:
                monitor_thread.join()
                monitor_thread = None
            del self.events[key]

    def stop_all_events(self):
        for key, pair in self.events.items():
            self.stop_event(key, *pair)
            print(f'Event stopped: {key}')


def get_memory_manager_controller():
    return MemoryManagerController()
