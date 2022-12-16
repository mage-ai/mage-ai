from mage_ai.orchestration.db.models import PipelineRun
from mage_ai.orchestration.execution_process_manager import ExecutionProcessManager
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks
from unittest.mock import MagicMock, patch


class ExecutionProcessManagerTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def test_has_pipeline_process(self):
        manager = ExecutionProcessManager()
        self.assertFalse(manager.has_pipeline_process(1))
        proc = MagicMock()
        manager.pipeline_processes[1] = proc
        self.assertTrue(manager.has_pipeline_process(1))

    def test_set_block_process(self):
        manager = ExecutionProcessManager()
        proc = MagicMock()
        manager.set_block_process(10, 50, proc)
        self.assertEqual(manager.block_processes[10][50], proc)

    def test_terminate_pipeline_process(self):
        manager = ExecutionProcessManager()
        proc = MagicMock()
        manager.set_pipeline_process(1, proc)
        with patch.object(proc, 'is_alive', return_value=True):
            with patch.object(proc, 'terminate') as mock_terminate:
                manager.terminate_pipeline_process(1)
                mock_terminate.assert_called_once()

    def test_set_pipeline_process(self):
        manager = ExecutionProcessManager()
        proc = MagicMock()
        with patch.object(manager, 'terminate_pipeline_process') as mock_terminate:
            manager.set_pipeline_process(10, proc)
            self.assertEqual(manager.pipeline_processes[10], proc)
            mock_terminate.assert_called_once_with(10)
        self.assertTrue(manager.has_pipeline_process(10))

    def test_clean_up_processes(self):
        pipeline_run1 = PipelineRun.create(pipeline_uuid='test_pipeline')
        pipeline_run2 = PipelineRun.create(pipeline_uuid='test_pipeline')
        pipeline_run3 = PipelineRun.create(pipeline_uuid='test_pipeline')

        block_runs = pipeline_run1.block_runs
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

        manager = ExecutionProcessManager()
        proc_block_terminated = MagicMock()
        proc_block_terminated.is_alive = MagicMock(return_value=False)
        proc_block_cancelled = MagicMock()
        proc_block_live = MagicMock()
        proc_pipeline_terminated = MagicMock()
        proc_pipeline_terminated.is_alive = MagicMock(return_value=False)
        proc_pipeline_cancelled = MagicMock()
        proc_pipeline_live = MagicMock()
        manager.set_block_process(pipeline_run1.id, block_runs[0].id, proc_block_terminated)
        manager.set_block_process(pipeline_run2.id, block_runs[1].id, proc_block_cancelled)
        manager.set_block_process(pipeline_run1.id, block_runs[2].id, proc_block_live)
        manager.set_pipeline_process(pipeline_run1.id, proc_pipeline_terminated)
        manager.set_pipeline_process(pipeline_run2.id, proc_pipeline_cancelled)
        manager.set_pipeline_process(pipeline_run3.id, proc_pipeline_live)

        manager.clean_up_processes(include_child_processes=False)
        self.assertEqual(
            manager.block_processes,
            {pipeline_run1.id: {block_runs[2].id: proc_block_live}},
        )
        self.assertEqual(
            manager.pipeline_processes,
            {pipeline_run3.id: proc_pipeline_live},
        )
