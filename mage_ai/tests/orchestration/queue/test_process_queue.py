from contextlib import ExitStack
from queue import Queue as InMemoryQueue
from unittest.mock import patch

from mage_ai.orchestration.queue.config import QueueConfig
from mage_ai.orchestration.queue.process_queue import (
    SENTRY_FLUSH_TIMEOUT_SECONDS,
    JobStatus,
    ProcessQueue,
    Worker,
)
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

    def test_worker_flushes_sentry_after_capturing_exception(self):
        (
            mock_init,
            mock_capture_exception,
            mock_flush,
            expected_error,
        ) = self._run_worker_with_error(sentry_dsn='test-dsn')

        mock_init.assert_called_once()
        mock_capture_exception.assert_called_once_with(expected_error)
        mock_flush.assert_called_once_with(timeout=SENTRY_FLUSH_TIMEOUT_SECONDS)

    def test_worker_does_not_flush_sentry_when_not_configured(self):
        mock_init, mock_capture_exception, mock_flush, _ = self._run_worker_with_error()

        mock_init.assert_not_called()
        mock_capture_exception.assert_not_called()
        mock_flush.assert_not_called()

    def _run_worker_with_error(self, sentry_dsn=None):
        expected_error = RuntimeError('test worker error')
        queue = InMemoryQueue()
        job_dict = dict(block_run_1=JobStatus.QUEUED)
        queue.put(['block_run_1', run_block, tuple(), dict()])

        with ExitStack() as stack:
            stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.SENTRY_DSN', sentry_dsn),
            )
            mock_init = stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.sentry_sdk.init'),
            )
            stack.enter_context(patch('atexit.register'))
            stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.initialize_new_relic'),
            )
            stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.set_logging_format'),
            )
            stack.enter_context(
                patch(
                    'mage_ai.orchestration.queue.process_queue.start_session_and_run',
                    side_effect=expected_error,
                ),
            )
            mock_capture_exception = stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.capture_exception'),
            )
            mock_flush = stack.enter_context(
                patch('mage_ai.orchestration.queue.process_queue.sentry_sdk.flush'),
            )

            worker = Worker(queue, job_dict)

            with self.assertRaises(RuntimeError):
                worker.run()

        return mock_init, mock_capture_exception, mock_flush, expected_error
