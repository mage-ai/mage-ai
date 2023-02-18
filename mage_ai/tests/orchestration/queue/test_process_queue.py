from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.process_queue import JobStatus, ProcessQueue
from mage_ai.tests.base_test import TestCase


class ProcessQueueTests(TestCase):
    def setUp(self):
        queue_config = QueueConfig.load(config=dict(concurrency=100))
        self.queue = ProcessQueue(queue_config=queue_config)

    def test_init(self):
        self.assertEqual(self.queue.size, 100)

    def test_clean_up_jobs(self):
        self.queue.job_dict['block_run_1'] = JobStatus.QUEUED
        self.queue.job_dict['block_run_2'] = 100
        self.queue.job_dict['block_run_3'] = JobStatus.COMPLETED
        self.queue.job_dict['block_run_4'] = JobStatus.CANCELLED
        self.queue.clean_up_jobs()
        self.assertEqual(self.queue.job_dict['block_run_1'], JobStatus.QUEUED)
        self.assertEqual(self.queue.job_dict['block_run_2'], 100)
        self.assertFalse('block_run_3' in self.queue.job_dict)
        self.assertFalse('block_run_4' in self.queue.job_dict)

    def test_has_job(self):
        self.queue.job_dict['block_run_1'] = JobStatus.QUEUED
        self.queue.job_dict['block_run_2'] = 100
        self.queue.job_dict['block_run_3'] = JobStatus.COMPLETED
        self.queue.job_dict['block_run_4'] = JobStatus.CANCELLED
        self.assertTrue(self.queue.has_job('block_run_1'))
        self.assertTrue(self.queue.has_job('block_run_2'))
        self.assertFalse(self.queue.has_job('block_run_3'))
        self.assertFalse(self.queue.has_job('block_run_4'))
        self.assertFalse(self.queue.has_job('block_run_5'))
