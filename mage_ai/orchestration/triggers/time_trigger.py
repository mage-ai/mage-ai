from abc import ABC, abstractmethod
from mage_ai.orchestration.scheduler_manager import schedule


class TimeTrigger(ABC):
    def __init__(self, trigger_interval: int = 10) -> None:
        self.trigger_interval = trigger_interval

    def run(self) -> None:
        schedule()

    @abstractmethod
    def start(self) -> None:
        pass
