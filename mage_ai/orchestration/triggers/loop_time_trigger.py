import time

from mage_ai.orchestration.triggers.time_trigger import TimeTrigger
from mage_ai.settings import SCHEDULER_TRIGGER_INTERVAL


class LoopTimeTrigger(TimeTrigger):
    def __init__(self, trigger_interval=SCHEDULER_TRIGGER_INTERVAL) -> None:
        super().__init__(trigger_interval)

    def start(self) -> None:
        while True:
            self.last_run_time = int(time.time())
            self.run()
            current_time = int(time.time())
            sleep_time = self.trigger_interval - (current_time - self.last_run_time)
            if sleep_time > 0:
                time.sleep(sleep_time)
