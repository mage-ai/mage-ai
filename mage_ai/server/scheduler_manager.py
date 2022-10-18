from enum import Enum
from mage_ai.orchestration.db.database_manager import database_manager
import multiprocessing
import threading
import time
import traceback

SCHEDULER_AUTO_RESTART_INTERVAL = 10


def run_scheduler():
    from mage_ai.orchestration.triggers.loop_time_trigger import LoopTimeTrigger

    database_manager.run_migrations()
    while True:
        try:
            LoopTimeTrigger().start()
        except Exception:
            traceback.print_exc()
            time.sleep(SCHEDULER_AUTO_RESTART_INTERVAL)
            print('Restarting pipeline scheduler.')


class SchedulerManager:
    """
    Singleton class to manage scheduler process.
    """

    class SchedulerStatus(str, Enum):
        RUNNING = 'running'
        STOPPED = 'stopped'

    def __init__(self):
        self.scheduler_process: multiprocessing.Process = None
        self.status = self.SchedulerStatus.STOPPED

    @property
    def is_alive(self):
        return self.scheduler_process is not None and self.scheduler_process.is_alive()

    def get_status(self, auto_restart: bool = False):
        if auto_restart and self.status == self.SchedulerStatus.RUNNING and not self.is_alive:
            self.start_scheduler()
        if self.is_alive:
            return SchedulerManager.SchedulerStatus.RUNNING
        return SchedulerManager.SchedulerStatus.STOPPED

    def start_scheduler(self):
        print('Start scheduler.')
        if self.is_alive:
            return

        proc = multiprocessing.Process(target=run_scheduler)
        proc.start()
        self.scheduler_process = proc
        self.status = self.SchedulerStatus.RUNNING

    def stop_scheduler(self):
        print('Stop scheduler.')
        if self.is_alive:
            self.scheduler_process.terminate()
            self.scheduler_process = None
            self.status = self.SchedulerStatus.STOPPED


scheduler_manager = SchedulerManager()


def check_scheduler_status():
    threading.Timer(30.0, check_scheduler_status).start()
    status = scheduler_manager.get_status(auto_restart=True)
    print(f'Scheduler status: {status}.')


check_scheduler_status()
