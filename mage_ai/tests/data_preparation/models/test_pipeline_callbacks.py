from unittest.mock import MagicMock

from mage_ai.data_preparation.models.block import Block, CallbackBlock
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline


class PipelineCallbacksTest(DBTestCase):
    def setUp(self):
        self.pipeline = create_pipeline('pipeline_callback_test', self.repo_path)

    def tearDown(self):
        self.pipeline.delete()

    def test_pipeline_callbacks_by_uuid_initialized(self):
        """Pipeline should initialize with empty pipeline_callbacks_by_uuid."""
        self.assertEqual(self.pipeline.pipeline_callbacks_by_uuid, {})
        self.assertEqual(self.pipeline.pipeline_callback_configs, [])

    def test_add_pipeline_callback_block(self):
        """Pipeline callback blocks should be added to pipeline_callbacks_by_uuid."""
        callback_block = CallbackBlock.create('pipeline_cb', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        self.assertIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)
        # Should NOT be in regular callbacks_by_uuid
        self.assertNotIn(callback_block.uuid, self.pipeline.callbacks_by_uuid)

    def test_delete_pipeline_callback_block(self):
        """Deleting a pipeline callback should remove it from pipeline_callbacks_by_uuid."""
        callback_block = CallbackBlock.create('pipeline_cb_del', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        self.assertIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)

        self.pipeline.delete_block(callback_block)
        self.assertNotIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)

    def test_to_dict_includes_pipeline_callbacks(self):
        """to_dict should include pipeline_callbacks key."""
        result = self.pipeline.to_dict()
        self.assertIn('pipeline_callbacks', result)
        self.assertEqual(result['pipeline_callbacks'], [])

    def test_to_dict_with_pipeline_callback_block(self):
        """to_dict should serialize pipeline callback blocks."""
        callback_block = CallbackBlock.create('pipeline_cb_dict', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        result = self.pipeline.to_dict()
        self.assertEqual(len(result['pipeline_callbacks']), 1)
        self.assertEqual(result['pipeline_callbacks'][0]['uuid'], callback_block.uuid)

    def test_load_config_with_pipeline_callbacks(self):
        """Loading pipeline config should restore pipeline_callbacks_by_uuid."""
        callback_block = CallbackBlock.create('pipeline_cb_load', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        # Reload pipeline from disk
        reloaded = Pipeline(self.pipeline.uuid, repo_path=self.repo_path)
        self.assertIn(callback_block.uuid, reloaded.pipeline_callbacks_by_uuid)
        self.assertEqual(len(reloaded.pipeline_callbacks_by_uuid), 1)

    def test_all_block_configs_includes_pipeline_callbacks(self):
        """all_block_configs should include pipeline callback configs."""
        callback_block = CallbackBlock.create('pipeline_cb_all', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        # Reload pipeline from disk so pipeline_callback_configs is populated
        reloaded = Pipeline(self.pipeline.uuid, repo_path=self.repo_path)
        all_uuids = [c.get('uuid') for c in reloaded.all_block_configs]
        self.assertIn(callback_block.uuid, all_uuids)

    def test_execute_pipeline_callbacks_on_success(self):
        """execute_pipeline_callbacks should call on_success on each pipeline callback block."""
        mock_callback_block = MagicMock()
        mock_callback_block.uuid = 'mock_pipeline_cb'
        self.pipeline.pipeline_callbacks_by_uuid = {
            'mock_pipeline_cb': mock_callback_block,
        }

        self.pipeline.execute_pipeline_callbacks(
            'on_success',
            callback_kwargs=dict(
                pipeline_run=dict(
                    pipeline_uuid='test',
                    status='completed',
                ),
            ),
            global_vars=dict(env='test'),
        )

        mock_callback_block.execute_callback.assert_called_once()
        call_args = mock_callback_block.execute_callback.call_args
        self.assertEqual(call_args[0][0], 'on_success')

    def test_execute_pipeline_callbacks_on_failure(self):
        """execute_pipeline_callbacks should call on_failure on each pipeline callback block."""
        mock_callback_block = MagicMock()
        mock_callback_block.uuid = 'mock_pipeline_cb_fail'
        self.pipeline.pipeline_callbacks_by_uuid = {
            'mock_pipeline_cb_fail': mock_callback_block,
        }

        self.pipeline.execute_pipeline_callbacks(
            'on_failure',
            callback_kwargs=dict(
                pipeline_run=dict(
                    pipeline_uuid='test',
                    status='failed',
                    error='Block X failed',
                    failed_blocks=['block_x'],
                ),
            ),
        )

        mock_callback_block.execute_callback.assert_called_once()
        call_args = mock_callback_block.execute_callback.call_args
        self.assertEqual(call_args[0][0], 'on_failure')

    def test_execute_pipeline_callbacks_handles_exception(self):
        """execute_pipeline_callbacks should not raise when a callback block fails."""
        mock_callback_block = MagicMock()
        mock_callback_block.uuid = 'failing_cb'
        mock_callback_block.execute_callback.side_effect = Exception('callback error')
        self.pipeline.pipeline_callbacks_by_uuid = {
            'failing_cb': mock_callback_block,
        }

        # Should not raise
        self.pipeline.execute_pipeline_callbacks(
            'on_success',
            callback_kwargs=dict(pipeline_run=dict(status='completed')),
        )

    def test_execute_pipeline_callbacks_noop_when_empty(self):
        """execute_pipeline_callbacks should be a no-op when no pipeline callbacks exist."""
        # Should not raise
        self.pipeline.execute_pipeline_callbacks(
            'on_success',
            callback_kwargs=dict(pipeline_run=dict(status='completed')),
        )

    def test_regular_callback_not_in_pipeline_callbacks(self):
        """Regular block-level callbacks should not appear in pipeline_callbacks_by_uuid."""
        block = Block.create('test_loader', 'data_loader', self.repo_path, pipeline=self.pipeline)
        self.pipeline.add_block(block)

        callback_block = CallbackBlock.create('block_level_cb', self.repo_path)
        self.pipeline.add_block(
            callback_block,
            upstream_block_uuids=[block.uuid],
        )

        self.assertIn(callback_block.uuid, self.pipeline.callbacks_by_uuid)
        self.assertNotIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)
