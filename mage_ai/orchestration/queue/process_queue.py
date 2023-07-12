import multiprocessing as mp
import os
import signal
import time
from enum import Enum
from multiprocessing import Manager
from typing import Callable

import newrelic.agent
import sentry_sdk
from sentry_sdk import capture_exception

from mage_ai.orchestration.db.process import start_session_and_run
from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.queue import Queue
from mage_ai.services.newrelic import initialize_new_relic
from mage_ai.settings import SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE


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
        self.queue = mp.Queue()
        self.size = queue_config.concurrency or os.cpu_count()
        self.mp_manager = Manager()
        self.job_dict = self.mp_manager.dict()

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
        self._print(f'Enqueue job {job_id}')
        self.queue.put([job_id, target, args, kwargs])
        self.job_dict[job_id] = JobStatus.QUEUED
        if not self.is_worker_pool_alive():
            self.start_worker_pool()

    def has_job(self, job_id: str) -> bool:
        """
        Checks if a job with the given ID exists in the queue or is currently being executed.

        Args:
            job_id (str): The ID of the job.

        Returns:
            bool: True if the job exists, False otherwise.

        """
        job = self.job_dict.get(job_id)
        return job is not None and (job == JobStatus.QUEUED or isinstance(job, int))

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
            args=[self.queue, self.size, self.job_dict],
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


class Worker(mp.Process):
    def __init__(self, queue: mp.Queue, job_dict):
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


def poll_job_and_execute(queue, size, job_dict):
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
