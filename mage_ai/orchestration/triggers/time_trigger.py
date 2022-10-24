from abc import ABC, abstractmethod
from mage_ai.orchestration.pipeline_scheduler import check_sla, schedule_all


class TimeTrigger(ABC):
    def __init__(self, trigger_interval: int = 10) -> None:
        self.trigger_interval = trigger_interval

    def run(self) -> None:
        schedule_all()
        check_sla()

    @abstractmethod
    def start(self) -> None:
        pass
