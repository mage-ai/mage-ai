import traceback
from enum import Enum
from typing import Callable, Dict, Union

from mage_ai.orchestration.queue.queue_factory import QueueFactory


class JobType(str, Enum):
    BLOCK_RUN = 'block_run'
    PIPELINE_RUN = 'pipeline_run'
    INTEGRATION_STREAM = 'integration_stream'


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

    def has_block_run_job(
        self,
        block_run_id: int,
        logger=None,
        logging_tags: Dict = None,
    ) -> bool:
        job_id = self.__job_id(JobType.BLOCK_RUN, block_run_id)
        return self.queue.has_job(
            job_id,
            logger=logger,
            logging_tags=logging_tags,
        )

    def has_pipeline_run_job(
        self,
        pipeline_run_id: int,
        logger=None,
        logging_tags: Dict = None,
    ) -> bool:
        job_id = self.__job_id(JobType.PIPELINE_RUN, pipeline_run_id)
        return self.queue.has_job(
            job_id,
            logger=logger,
            logging_tags=logging_tags,
        )

    def has_integration_stream_job(
        self,
        pipeline_run_id: int,
        stream: str,
        logger=None,
        logging_tags: Dict = None,
    ) -> bool:
        job_id = self.__job_id(JobType.PIPELINE_RUN, f'{pipeline_run_id}_{stream}')
        return self.queue.has_job(
            job_id,
            logger=logger,
            logging_tags=logging_tags,
        )

    def kill_block_run_job(self, block_run_id):
        print(f'Kill block run id: {block_run_id}')
        job_id = self.__job_id(JobType.BLOCK_RUN, block_run_id)
        return self.queue.kill_job(job_id)

    def kill_pipeline_run_job(self, pipeline_run_id):
        print(f'Kill pipeline run id: {pipeline_run_id}')
        job_id = self.__job_id(JobType.PIPELINE_RUN, pipeline_run_id)
        return self.queue.kill_job(job_id)

    def kill_integration_stream_job(self, pipeline_run_id, stream):
        id = f'{pipeline_run_id}_{stream}'
        print(f'Kill integration stream id: {id}')
        job_id = self.__job_id(JobType.INTEGRATION_STREAM, id)
        return self.queue.kill_job(job_id)

    def start(self):
        self.queue.start()

    def stop(self):
        self.queue.stop()

    def __job_id(self, job_type: JobType, uid: Union[str, int]):
        return f'{job_type}_{uid}'


try:
    job_manager = JobManager()
except Exception:
    traceback.print_exc()
    job_manager = None
