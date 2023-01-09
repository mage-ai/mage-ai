from mage_ai.orchestration.db.models import PipelineRun
import multiprocessing as mp
import os
import signal
import time
import uuid


class ExecutionProcessManager:
    def __init__(self):
        self.block_processes = dict()
        self.pipeline_processes = dict()

    def has_pipeline_process(self, pipeline_run_id: int):
        return (
            pipeline_run_id in self.pipeline_processes
            and self.pipeline_processes[pipeline_run_id].is_alive()
        )

    def terminate_pipeline_process(self, pipeline_run_id: int) -> None:
        if self.has_pipeline_process(pipeline_run_id):
            self.pipeline_processes[pipeline_run_id].terminate()

    def set_pipeline_process(
        self,
        pipeline_run_id: int,
        proc: mp.Process,
    ):
        self.terminate_pipeline_process(pipeline_run_id)
        self.pipeline_processes[pipeline_run_id] = proc

    def has_block_process(self, pipeline_run_id: int, block_run_id: int):
        return (
            pipeline_run_id in self.block_processes
            and block_run_id in self.block_processes[pipeline_run_id]
            and self.block_processes[pipeline_run_id][block_run_id].is_alive()
        )

    def set_block_process(
        self,
        pipeline_run_id: int,
        block_run_id: int,
        proc: mp.Process,
    ):
        self.terminate_block_process(pipeline_run_id, block_run_id)
        if pipeline_run_id not in self.block_processes:
            self.block_processes[pipeline_run_id] = dict()
        self.block_processes[pipeline_run_id][block_run_id] = proc

    def terminate_block_process(self, pipeline_run_id: int, block_run_id: int) -> None:
        if self.has_block_process(pipeline_run_id, block_run_id):
            self.block_processes[pipeline_run_id][block_run_id].terminate()

    def clean_up_processes(self, include_child_processes=True):
        """
        Clean up inactive processes and terminate processes for cancelled pipeline runs
        """
        for pipeline_run_id in list(self.block_processes.keys()):
            block_run_procs = self.block_processes[pipeline_run_id]
            if not block_run_procs:
                del self.block_processes[pipeline_run_id]
                continue
            # TODO: Improve perf by batch fetching the pipeline runs
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            if pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                for block_run_id in list(block_run_procs.keys()):
                    proc = block_run_procs[block_run_id]
                    if proc.is_alive():
                        proc.terminate()

                        # Kill subprocess children
                        if include_child_processes:
                            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    del block_run_procs[block_run_id]
            else:
                for block_run_id in list(block_run_procs.keys()):
                    proc = block_run_procs[block_run_id]
                    if not proc.is_alive():
                        del block_run_procs[block_run_id]
            if not block_run_procs:
                del self.block_processes[pipeline_run_id]

        for pipeline_run_id in list(self.pipeline_processes.keys()):
            pipeline_run_proc = self.pipeline_processes[pipeline_run_id]
            if not pipeline_run_proc.is_alive():
                del self.pipeline_processes[pipeline_run_id]
            else:
                pipeline_run = PipelineRun.query.get(pipeline_run_id)
                if pipeline_run and pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                    pipeline_run_proc.terminate()
                    del self.pipeline_processes[pipeline_run_id]


execution_process_manager = ExecutionProcessManager()


def start_session_and_run(*target_args):
    from mage_ai.orchestration.db import db_connection

    if len(target_args) == 0:
        return None
    target = target_args[0]
    args = target_args[1:]

    db_connection.start_session(force=True)

    try:
        results = target(*args)
    finally:
        db_connection.close_session()
    return results


def create_process(target, args=()):
    from mage_ai.orchestration.db import engine 

    new_args = [target, *args]
    engine.dispose()
    return mp.Process(target=start_session_and_run, args=new_args)


class Worker(mp.Process):
    def __init__(self, queue: mp.Queue):
        super().__init__()
        self.queue = queue
        self.job_uuid = None

    def run(self):
        while True:
            if not self.queue.empty():
                args = self.queue.get()

                self.job_uuid = args[0]
                run_args = args[1:]

                try:
                    start_session_and_run(*run_args)
                finally:
                    self.job_uuid = None

            time.sleep(1)


class WorkerManager:
    def __init__(self, max_processes=None):
        if max_processes is None:
            max_processes = os.cpu_count()
        self.max_processes = max_processes
        self.queue = mp.Queue()
        self.workers = []

    def start_workers(self):
        if len(self.workers) == 0:
            from mage_ai.orchestration.db import engine
            engine.dispose()
            for _ in range(self.max_processes):
                worker = Worker(self.queue)
                worker.start()
                self.workers.append(worker)

    def terminate_workers(self):
        for worker in self.workers:
            worker.terminate()
        self.workers = []
    
    def cancel_job(self, job_uuid):
        for worker in self.workers:
            if worker.job_uuid == job_uuid:
                worker.terminate()
                self.workers.remove(worker)
                new_worker = Worker(self.queue)
                new_worker.start()
                self.workers.append(new_worker)
                break

    def is_alive(self, job_uuid) -> bool:
        for worker in self.workers:
            if worker.job_uuid == job_uuid:
                return True

        return False

    def add_job(self, target, args=()) -> str:
        job_uuid = str(uuid.uuid4())
        self.queue.put([job_uuid, target, *args])
        return job_uuid


class JobManager:
    def __init__(self):
        self.block_jobs = dict()
        self.pipeline_jobs = dict()

    def has_block_job(self, pipeline_run_id: int, block_run_id: int):
        return (
            pipeline_run_id in self.block_jobs
            and block_run_id in self.block_jobs[pipeline_run_id]
            and worker_manager.is_alive(self.block_jobs[pipeline_run_id][block_run_id])
        )

    def set_block_job(
        self,
        pipeline_run_id: int,
        block_run_id: int,
        job_uuid: str,
    ):
        self.terminate_block_job(pipeline_run_id, block_run_id)
        if pipeline_run_id not in self.block_jobs:
            self.block_jobs[pipeline_run_id] = dict()
        self.block_jobs[pipeline_run_id][block_run_id] = job_uuid

    def terminate_block_job(self, pipeline_run_id: int, block_run_id: int) -> None:
        if self.has_block_job(pipeline_run_id, block_run_id):
            worker_manager.cancel_job(self.block_jobs[pipeline_run_id][block_run_id])

    def clean_up_jobs(self, include_child_processes=True):
        """
        Clean up inactive processes and terminate processes for cancelled pipeline runs
        """
        for pipeline_run_id in list(self.block_jobs.keys()):
            block_run_jobs = self.block_jobs[pipeline_run_id]
            if not block_run_jobs:
                del self.block_jobs[pipeline_run_id]
                continue
            # TODO: Improve perf by batch fetching the pipeline runs
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            if pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                for block_run_id in list(block_run_jobs.keys()):
                    job = block_run_jobs[block_run_id]
                    if worker_manager.is_alive(job):
                        worker_manager.cancel_job(job)
                    del block_run_jobs[block_run_id]
            else:
                for block_run_id in list(block_run_jobs.keys()):
                    job = block_run_jobs[block_run_id]
                    if not worker_manager.is_alive(job):
                        del block_run_jobs[block_run_id]
            if not block_run_jobs:
                del self.block_jobs[pipeline_run_id]


worker_manager = WorkerManager()
execution_job_manager = JobManager()
