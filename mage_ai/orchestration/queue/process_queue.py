import multiprocessing as mp
import os
import signal
import time
from enum import Enum
from multiprocessing import Manager
from typing import Callable, Dict

import newrelic.agent
import psutil
import sentry_sdk
from sentry_sdk import capture_exception

from mage_ai.orchestration.db.process import start_session_and_run
from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.queue import Queue
from mage_ai.services.newrelic import initialize_new_relic
from mage_ai.services.redis.redis import init_redis_client
from mage_ai.settings import (
    HOSTNAME,
    REDIS_URL,
    SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE,
    SERVER_LOGGING_FORMAT,
    SERVER_VERBOSITY,
)
from mage_ai.shared.logger import set_logging_format

LIVENESS_TIMEOUT_SECONDS = 300


class JobStatus(str, Enum):
    QUEUED = 'queued'
    RUNNING = 'running'  # Not used. The value for RUNNING job is process id.
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'


class ProcessQueue(Queue):
    def __init__(self, queue_config: QueueConfig):
        """
        A process-based implementation of a queue that allows enqueueing and executing jobs using
        multiprocessing.

        Args:
            queue_config (QueueConfig): The configuration for the process queue.

        Attributes:
            queue_config (QueueConfig): The configuration for the process queue.
            queue (mp.Queue): A multiprocessing queue for storing the jobs.
            size (int): The size of the worker pool (defaults to the number of CPUs).
            mp_manager (Manager): A multiprocessing manager for maintaining a shared dictionary for
                jobs.

        """
        self.queue_config = queue_config
        self.process_queue_config = self.queue_config.process_queue_config
        self.queue = mp.Queue()
        self.size = queue_config.concurrency or os.cpu_count()
        self.mp_manager = Manager()
        self.job_dict = self.mp_manager.dict()

        # Initialize redis client to track jobs across multiple replicas
        if self.process_queue_config and self.process_queue_config.redis_url:
            redis_url = self.process_queue_config.redis_url
        elif REDIS_URL:
            redis_url = REDIS_URL
        else:
            redis_url = None

        self.redis_client = init_redis_client(redis_url)

        self.client_id = f'HOST_{HOSTNAME}_PID_{os.getpid()}'

        self.worker_pool_proc = None

    def clean_up_jobs(self):
        """
        Cleans up completed jobs from the job dictionary.
        """
        job_ids = self.job_dict.keys()
        for job_id in job_ids:
            if job_id in self.job_dict and not self.has_job(job_id):
                del self.job_dict[job_id]

    def enqueue(self, job_id: str, target: Callable, *args, **kwargs):
        """
        Enqueues a job to be executed in the worker pool.

        Args:
            job_id (str): The ID of the job.
            target (Callable): The target function to execute.
            *args: Variable length argument list for the target function.
            **kwargs: Keyword arguments for the target function.

        """
        if self.has_job(job_id):
            self._print(f'Job {job_id} exists. Skip enqueue.')
            return
        self._print(f'Enqueue job {job_id}')
        if self.redis_client:
            self.redis_client.set(job_id, self.client_id)
        if self.redis_client:
            self.redis_client.set(self.client_id, '1', ex=LIVENESS_TIMEOUT_SECONDS)
        self.queue.put([job_id, target, args, kwargs])
        self.job_dict[job_id] = JobStatus.QUEUED
        if not self.is_worker_pool_alive():
            self.start_worker_pool()

    def has_job(self, job_id: str, logger=None, logging_tags: Dict = None) -> bool:
        """
        Checks if a job with the given ID exists in the queue or is currently being executed.

        Args:
            job_id (str): The ID of the job.

        Returns:
            bool: True if the job exists, False otherwise.

        """
        if self.redis_client:
            job_client_id = self.redis_client.get(job_id)
            if not job_client_id:
                return False
            if job_client_id != self.client_id and self.redis_client.get(job_client_id):
                return True
        job = self.job_dict.get(job_id)
        if job is None:
            return False
        if job == JobStatus.QUEUED and not self.queue.empty():
            # Job is in queue
            return True
        if isinstance(job, int):
            # Job is being processed
            if self.__is_process_alive(job):
                return True
            else:
                # Process is dead
                if logger is not None:
                    logger.info(
                        f'Process {job} is dead for job {job_id}',
                        **(logging_tags or dict()))
                return False
        # Return False if job is in other statuses
        return False

    def kill_job(self, job_id: str):
        """
        Cancels and kills a job with the given ID if it is running.

        Args:
            job_id (str): The ID of the job.

        """
        print(f'Kill job {job_id}, job_dict {self.job_dict}')
        job = self.job_dict.get(job_id)
        if not job:
            return
        if isinstance(job, int):
            if job == os.getpid():
                # Update the job status before the process is killed
                self.job_dict[job_id] = JobStatus.CANCELLED
            try:
                os.kill(job, signal.SIGKILL)
            except Exception as err:
                print(err)
        self.job_dict[job_id] = JobStatus.CANCELLED

    def start_worker_pool(self):
        """
        Starts the worker pool by creating a new process for executing jobs.
        """
        self.worker_pool_proc = mp.Process(
            target=poll_job_and_execute,
            args=[
                self.queue,
                self.size,
                self.job_dict,
                self.redis_client,
                self.client_id,
            ],
        )
        self.worker_pool_proc.start()

    def is_worker_pool_alive(self) -> bool:
        """
        Checks if the worker pool process is alive.

        Returns:
            bool: True if the worker pool process is alive, False otherwise.

        """
        if self.worker_pool_proc is None:
            return False
        return self.worker_pool_proc.is_alive()

    def __is_process_alive(self, pid: int) -> bool:
        return psutil.pid_exists(pid)


class Worker(mp.Process):
    def __init__(
        self,
        queue: mp.Queue,
        job_dict,
    ):
        """
        A worker process for executing jobs from the process queue.

        Args:
            queue (mp.Queue): The multiprocessing queue from which jobs are fetched.
            job_dict: The shared job dictionary.

        Attributes:
            queue (mp.Queue): The multiprocessing queue from which jobs are fetched.
            job_dict: The shared job dictionary.
            dsn (str): The Sentry DSN for error reporting.

        """
        super().__init__()
        self.queue = queue
        self.job_dict = job_dict
        self.dsn = SENTRY_DSN
        if self.dsn:
            sentry_sdk.init(
                self.dsn,
                traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
            )
        initialize_new_relic()

        set_logging_format(
            logging_format=SERVER_LOGGING_FORMAT,
            level=SERVER_VERBOSITY,
        )

    @newrelic.agent.background_task(name='worker-run', group='Task')
    def run(self):
        """
        The entry point for the worker process.

        Fetches a job from the queue, executes it, and updates the job status in the job dictionary.

        """
        if not self.queue.empty():
            args = self.queue.get()
            job_id = args[0]
            print(f'Run worker for job {job_id}')
            if self.job_dict[job_id] != JobStatus.QUEUED:
                return
            self.job_dict[job_id] = self.pid

            try:
                start_session_and_run(args[1], *args[2], **args[3])
            except Exception as e:
                if self.dsn:
                    capture_exception(e)
                raise
            finally:
                self.job_dict[job_id] = JobStatus.COMPLETED


def poll_job_and_execute(
    queue: mp.Queue,
    size: int,
    job_dict,
    redis_client,
    client_id: str,
):
    """
    Continuously polls the job queue and executes jobs in a worker pool.

    Args:
        queue: The multiprocessing queue from which jobs are fetched.
        size: The size of the worker pool.
        job_dict: The shared job dictionary.

    """
    workers = []
    while True:
        workers = [w for w in workers if w.is_alive()]
        print(f'Worker pool size: {len(workers)}')
        if not workers and queue.empty():
            break
        while not queue.empty():
            if len(workers) >= size:
                break
            worker = Worker(queue, job_dict)
            worker.start()
            workers.append(worker)
        time.sleep(1)
        if redis_client and client_id:
            redis_client.set(client_id, '1', ex=LIVENESS_TIMEOUT_SECONDS)
