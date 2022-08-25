from enum import Enum
from mage_ai.orchestration.db.database_manager import database_manager
import multiprocessing


def run_scheduler():
    from mage_ai.orchestration.triggers.loop_time_trigger import LoopTimeTrigger

    database_manager.run_migrations()
    LoopTimeTrigger().start()


class SchedulerManager:
    """
    Singleton class to manage scheduler process.
    """

    class SchedulerStatus(str, Enum):
        RUNNING = 'running'
        STOPPED = 'stopped'

    def __init__(self):
        self.scheduler_process: multiprocessing.Process = None

    @property
    def is_alive(self):
        return self.scheduler_process is not None and self.scheduler_process.is_alive()

    def get_status(self):
        if self.is_alive:
            return SchedulerManager.SchedulerStatus.RUNNING
        return SchedulerManager.SchedulerStatus.STOPPED

    def start_scheduler(self):
        if self.is_alive:
            return

        proc = multiprocessing.Process(target=run_scheduler)
        proc.start()
        self.scheduler_process = proc

    def stop_scheduler(self):
        if self.is_alive:
            self.scheduler_process.terminate()
            self.scheduler_process = None


scheduler_manager = SchedulerManager()
