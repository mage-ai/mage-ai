from mage_ai.orchestration.queue.queue_factory import QueueFactory
from typing import Callable, Union
from enum import Enum


class JobType(str, Enum):
    BLOCK_RUN = 'block_run'
    PIPELINE_RUN = 'pipeline_run'


class JobManager:
    def __init__(self):
        self.queue = QueueFactory.get_queue()

    def add_job(
        self,
        job_type: JobType,
        uid: Union[str, int],
        target: Callable,
        *args,
        **kwargs
    ):
        job_id = self.__job_id(job_type, uid)

        self.queue.enqueue(job_id, target, *args, **kwargs)

    def clean_up_jobs(self):
        self.queue.clean_up_jobs()

    def has_block_run_job(self, block_run_id):
        job_id = self.__job_id(JobType.BLOCK_RUN, block_run_id)
        return self.queue.has_job(job_id)

    def has_pipeline_run_job(self, pipeline_run_id):
        job_id = self.__job_id(JobType.PIPELINE_RUN, pipeline_run_id)
        return self.queue.has_job(job_id)

    def kill_block_run_job(self, block_run_id):
        print(f'Kill block run id: {block_run_id}')
        job_id = self.__job_id(JobType.BLOCK_RUN, block_run_id)
        return self.queue.kill_job(job_id)

    def kill_pipeline_run_job(self, pipeline_run_id):
        print(f'Kill pipeline run id: {pipeline_run_id}')
        job_id = self.__job_id(JobType.PIPELINE_RUN, pipeline_run_id)
        return self.queue.kill_job(job_id)

    def __job_id(self, job_type: JobType, uid: Union[str, int]):
        return f'{job_type}_{uid}'


job_manager = JobManager()
