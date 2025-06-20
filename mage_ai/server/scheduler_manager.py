import multiprocessing
import time
import traceback
from contextlib import nullcontext

import newrelic.agent
import sentry_sdk

from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.orchestration.db.process import create_process
from mage_ai.server.logger import Logger
from mage_ai.services.newrelic import initialize_new_relic
from mage_ai.settings import (
    SENTRY_DSN,
    SENTRY_SERVER_NAME,
    SENTRY_TRACES_SAMPLE_RATE,
    SERVER_LOGGING_FORMAT,
    SERVER_VERBOSITY,
)
from mage_ai.shared.enum import StrEnum
from mage_ai.shared.logger import set_logging_format

SCHEDULER_AUTO_RESTART_INTERVAL = 20_000  # in milliseconds

logger = Logger().new_server_logger(__name__)


def run_scheduler():
    from mage_ai.orchestration.job_manager import get_job_manager
    from mage_ai.orchestration.triggers.loop_time_trigger import LoopTimeTrigger

    job_manager = get_job_manager()

    sentry_dsn = SENTRY_DSN
    if sentry_dsn:
        sentry_sdk.init(
            sentry_dsn,
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
            server_name=SENTRY_SERVER_NAME,
        )
    (enable_new_relic, application) = initialize_new_relic()
    try:
        with (
            newrelic.agent.BackgroundTask(application, name='db-migration', group='Task')
            if enable_new_relic
            else nullcontext()
        ):
            database_manager.run_migrations()
    except Exception:
        traceback.print_exc()

    set_logging_format(
        logging_format=SERVER_LOGGING_FORMAT,
        level=SERVER_VERBOSITY,
    )

    try:
        if job_manager is not None:
            job_manager.start()
        LoopTimeTrigger().start()
    except Exception as e:
        if job_manager is not None:
            job_manager.stop()
        logger.exception('Failed to run scheduler.')
        raise e


class SchedulerManager:
    """
    Singleton class to manage scheduler process.
    """

    class SchedulerStatus(StrEnum):
        RUNNING = 'running'
        STOPPED = 'stopped'

    def __init__(self):
        self.scheduler_process: multiprocessing.Process = None
        self.status = self.SchedulerStatus.STOPPED

    @property
    def is_alive(self):
        return self.scheduler_process is not None and self.scheduler_process.is_alive()

    def get_scheduler_pid(self):
        if not self.scheduler_process:
            return None
        try:
            return self.scheduler_process.pid
        except Exception:
            traceback.print_exc()
            return None

    def get_status(self, auto_restart: bool = False):
        if auto_restart and self.status == self.SchedulerStatus.RUNNING and not self.is_alive:
            logger.info('Restarting pipeline scheduler.')
            self.start_scheduler()
        if self.is_alive:
            return SchedulerManager.SchedulerStatus.RUNNING
        return SchedulerManager.SchedulerStatus.STOPPED

    def start_scheduler(self, foreground: bool = False):
        logger.info('Start scheduler.')
        if self.is_alive:
            return

        proc = create_process(target=run_scheduler)
        proc.start()
        self.scheduler_process = proc
        self.status = self.SchedulerStatus.RUNNING
        if foreground:
            while True:
                check_scheduler_status()
                time.sleep(SCHEDULER_AUTO_RESTART_INTERVAL / 1000)

    def stop_scheduler(self):
        from mage_ai.orchestration.job_manager import get_job_manager

        job_manager = get_job_manager()

        logger.info('Stop scheduler.')
        if self.is_alive:
            self.scheduler_process.terminate()
            if job_manager is not None:
                job_manager.stop()
            self.scheduler_process = None
            self.status = self.SchedulerStatus.STOPPED


scheduler_manager = SchedulerManager()


def check_scheduler_status():
    status = scheduler_manager.get_status(auto_restart=True)
    logger.info(f'Scheduler status: {status}.')
