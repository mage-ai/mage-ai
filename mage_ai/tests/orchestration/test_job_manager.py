from unittest.mock import MagicMock

from mage_ai.orchestration.job_manager import JobManager, JobType
from mage_ai.orchestration.queue.queue_factory import QueueFactory
from mage_ai.tests.base_test import TestCase


class JobManagerTests(TestCase):
    def setUp(self):
        self.mock_queue = MagicMock()
        QueueFactory.get_queue = MagicMock(return_value=self.mock_queue)
        self.job_manager = JobManager()

    def test_add_job(self):
        def test_func(arg1: int, arg2: int):
            return arg1 + arg2

        self.job_manager.add_job(JobType.PIPELINE_RUN, 1, test_func, 1, 2)

        self.mock_queue.enqueue.assert_called_once_with(
            'pipeline_run_1',
            test_func,
            1,
            2,
        )

    def test_clean_up_jobs(self):
        self.job_manager.clean_up_jobs()
        self.mock_queue.clean_up_jobs.assert_called_once()

    def test_has_block_run_job(self):
        self.job_manager.has_block_run_job(2)
        self.mock_queue.has_job.assert_called_once_with(
            'block_run_2',
            logger=None,
            logging_tags=None,
        )

    def test_has_pipeline_run_job(self):
        self.job_manager.has_pipeline_run_job(3)
        self.mock_queue.has_job.assert_called_once_with(
            'pipeline_run_3',
            logger=None,
            logging_tags=None,
        )

    def test_kill_block_run_job(self):
        self.job_manager.kill_block_run_job(4)
        self.mock_queue.kill_job.assert_called_once_with('block_run_4')

    def test_kill_pipeline_run_job(self):
        self.job_manager.kill_pipeline_run_job(5)
        self.mock_queue.kill_job.assert_called_once_with('pipeline_run_5')
