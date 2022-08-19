from abc import ABC, abstractmethod
from mage_ai.orchestration.scheduler_manager import schedule


class TimeTrigger:
    def __init__(self, trigger_interval: int = 10):
        self.trigger_interval = trigger_interval

    def run(self):
        schedule()

    @abstractmethod
    def start(self):
        pass
