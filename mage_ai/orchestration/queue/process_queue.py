from enum import Enum
from mage_ai.orchestration.db.process import start_session_and_run
from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.queue import Queue
from multiprocessing import Manager
from typing import Callable
import multiprocessing as mp
import os
import signal
import time


class JobStatus(str, Enum):
    QUEUED = 'queued'
    RUNNING = 'running'  # Not used. The value for RUNNING job is process id.
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'


class ProcessQueue(Queue):
    def __init__(self, queue_config: QueueConfig):
        self.queue_config = queue_config
        self.queue = mp.Queue()
        self.size = queue_config.concurrency or os.cpu_count()
        self.mp_manager = Manager()
        self.job_dict = self.mp_manager.dict()

        self.worker_pool_proc = None

    def clean_up_jobs(self):
        job_ids = self.job_dict.keys()
        for job_id in job_ids:
            if job_id in self.job_dict and not self.has_job(job_id):
                del self.job_dict[job_id]

    def enqueue(self, job_id: str, target: Callable, *args, **kwargs):
        self._print(f'Enqueue job {job_id}')
        self.queue.put([job_id, target, args, kwargs])
        self.job_dict[job_id] = JobStatus.QUEUED
        if not self.is_worker_pool_alive():
            self.start_worker_pool()

    def has_job(self, job_id: str):
        job = self.job_dict.get(job_id)
        return job is not None and (job == JobStatus.QUEUED or isinstance(job, int))

    def kill_job(self, job_id: str):
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
        self.worker_pool_proc = mp.Process(
            target=poll_job_and_execute,
            args=[self.queue, self.size, self.job_dict],
        )
        self.worker_pool_proc.start()

    def is_worker_pool_alive(self):
        if self.worker_pool_proc is None:
            return False
        return self.worker_pool_proc.is_alive()


class Worker(mp.Process):
    def __init__(self, queue: mp.Queue, job_dict):
        super().__init__()
        self.queue = queue
        self.job_dict = job_dict

    def run(self):
        if not self.queue.empty():
            args = self.queue.get()

            job_id = args[0]
            print(f'Run worker for job {job_id}')
            if self.job_dict[job_id] != JobStatus.QUEUED:
                return
            self.job_dict[job_id] = self.pid
            try:
                start_session_and_run(args[1], *args[2], **args[3])
            finally:
                self.job_dict[job_id] = JobStatus.COMPLETED


def poll_job_and_execute(queue, size, job_dict):
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
