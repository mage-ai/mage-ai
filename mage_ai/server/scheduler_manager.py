from enum import Enum
from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.orchestration.db.process import create_process
from mage_ai.server.logger import Logger
from mage_ai.settings import (
    SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE,
)
import multiprocessing
import sentry_sdk
import traceback


SCHEDULER_AUTO_RESTART_INTERVAL = 20_000    # in milliseconds

logger = Logger().new_server_logger(__name__)


def run_scheduler():
    from mage_ai.orchestration.triggers.loop_time_trigger import LoopTimeTrigger

    sentry_dsn = SENTRY_DSN
    if sentry_dsn:
        sentry_sdk.init(
            sentry_dsn,
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        )

    try:
        database_manager.run_migrations()
    except Exception:
        traceback.print_exc()
    try:
        LoopTimeTrigger().start()
    except Exception as e:
        traceback.print_exc()
        raise e


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
            logger.info('Restarting pipeline scheduler.')
            self.start_scheduler()
        if self.is_alive:
            return SchedulerManager.SchedulerStatus.RUNNING
        return SchedulerManager.SchedulerStatus.STOPPED

    def start_scheduler(self):
        logger.info('Start scheduler.')
        if self.is_alive:
            return

        proc = create_process(target=run_scheduler)
        proc.start()
        self.scheduler_process = proc
        self.status = self.SchedulerStatus.RUNNING

    def stop_scheduler(self):
        logger.info('Stop scheduler.')
        if self.is_alive:
            self.scheduler_process.terminate()
            self.scheduler_process = None
            self.status = self.SchedulerStatus.STOPPED


scheduler_manager = SchedulerManager()


def check_scheduler_status():
    status = scheduler_manager.get_status(auto_restart=True)
    logger.info(f'Scheduler status: {status}.')
