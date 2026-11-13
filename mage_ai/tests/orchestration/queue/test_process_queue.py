from unittest.mock import patch

from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.process_queue import JobStatus, ProcessQueue
from mage_ai.tests.base_test import TestCase


def run_block():
    print('test run block')


class ProcessQueueTests(TestCase):
    def setUp(self):
        queue_config = QueueConfig.load(config=dict(concurrency=100))
        self.queue = ProcessQueue(queue_config=queue_config)
        self.queue.start()

    def test_init(self):
        self.assertEqual(self.queue.size, 100)

    @patch('mage_ai.orchestration.queue.process_queue.psutil.pid_exists')
    def test_clean_up_jobs(self, mock_pid_exists):
        mock_pid_exists.return_value = True

        self.queue.job_dict['block_run_1'] = JobStatus.QUEUED
        self.queue.job_dict['block_run_2'] = 100
        self.queue.job_dict['block_run_3'] = JobStatus.COMPLETED
        self.queue.job_dict['block_run_4'] = JobStatus.CANCELLED
        self.queue.clean_up_jobs()
        # queue is empty, thus 'block_run_1' is not in queue
        self.assertFalse('block_run_1' in self.queue.job_dict)
        self.assertEqual(self.queue.job_dict['block_run_2'], 100)
        self.assertFalse('block_run_3' in self.queue.job_dict)
        self.assertFalse('block_run_4' in self.queue.job_dict)

    @patch.object(ProcessQueue, 'is_worker_pool_alive')
    @patch.object(ProcessQueue, 'start_worker_pool')
    def test_clean_up_jobs_restarts_dead_worker_pool(
        self,
        mock_start_worker_pool,
        mock_is_worker_pool_alive,
    ):
        mock_is_worker_pool_alive.return_value = True
        self.queue.enqueue('block_run_1', run_block)
        mock_start_worker_pool.assert_not_called()

        # The worker pool is alive: nothing to do
        self.queue.clean_up_jobs()
        mock_start_worker_pool.assert_not_called()
        self.assertEqual(self.queue.job_dict['block_run_1'], JobStatus.QUEUED)

        # The worker pool died before it picked up the queued job
        mock_is_worker_pool_alive.return_value = False
        self.queue.clean_up_jobs()
        mock_start_worker_pool.assert_called_once()
        self.assertEqual(self.queue.job_dict['block_run_1'], JobStatus.QUEUED)

        # Restarting the pool can fail (e.g. the fork fails); the scheduler must survive it
        mock_start_worker_pool.side_effect = OSError('cannot fork')
        self.queue.clean_up_jobs()
        self.assertEqual(mock_start_worker_pool.call_count, 2)
        mock_start_worker_pool.side_effect = None

        # Nothing queued: a dead worker pool is normal, it exits when it is idle
        self.queue.queue.get()
        self.queue.clean_up_jobs()
        self.assertEqual(mock_start_worker_pool.call_count, 2)

    @patch.object(ProcessQueue, 'start_worker_pool')
    @patch('mage_ai.orchestration.queue.process_queue.psutil.pid_exists')
    def test_has_job(self, mock_pid_exists, mock_start_worker_pool):
        mock_start_worker_pool.return_value = None
        mock_pid_exists.return_value = True

        self.queue.job_dict['block_run_1'] = JobStatus.QUEUED
        self.queue.job_dict['block_run_2'] = 100
        self.queue.job_dict['block_run_3'] = JobStatus.COMPLETED
        self.queue.job_dict['block_run_4'] = JobStatus.CANCELLED

        # Queue is empty, thus return False
        self.assertFalse(self.queue.has_job('block_run_1'))
        # After enqueueing the job, the has_job method returns True
        self.queue.enqueue('block_run_1', run_block)
        self.assertTrue(self.queue.has_job('block_run_1'))

        self.assertTrue(self.queue.has_job('block_run_2'))
        self.assertFalse(self.queue.has_job('block_run_3'))
        self.assertFalse(self.queue.has_job('block_run_4'))
        self.assertFalse(self.queue.has_job('block_run_5'))

        # Process not exists
        mock_pid_exists.return_value = False
        self.assertTrue(self.queue.has_job('block_run_1'))
        self.assertFalse(self.queue.has_job('block_run_2'))
