from uuid import uuid4
from unittest.mock import MagicMock

from mage_ai.data_preparation.models.block import Block, CallbackBlock
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline


class PipelineCallbacksTest(DBTestCase):
    def setUp(self):
        self.pipeline = create_pipeline(
            f'pipeline_callback_test_{uuid4().hex[:8]}',
            self.repo_path,
        )

    def tearDown(self):
        self.pipeline.delete()

    def test_pipeline_callbacks_by_uuid_initialized(self):
        self.assertEqual({}, self.pipeline.pipeline_callbacks_by_uuid)
        self.assertEqual([], self.pipeline.pipeline_callback_configs)

    def test_add_pipeline_callback_block(self):
        callback_block = CallbackBlock.create(f'pipeline_cb_{uuid4().hex[:8]}', self.repo_path)

        self.pipeline.add_block(callback_block, pipeline_callback=True)

        self.assertIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)
        self.assertNotIn(callback_block.uuid, self.pipeline.callbacks_by_uuid)

    def test_delete_pipeline_callback_block(self):
        callback_block = CallbackBlock.create(f'pipeline_cb_{uuid4().hex[:8]}', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        self.pipeline.delete_block(callback_block)

        self.assertNotIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)

    def test_to_dict_includes_pipeline_callbacks(self):
        result = self.pipeline.to_dict()

        self.assertIn('pipeline_callbacks', result)
        self.assertEqual([], result['pipeline_callbacks'])

    def test_to_dict_with_pipeline_callback_block(self):
        callback_block = CallbackBlock.create(f'pipeline_cb_{uuid4().hex[:8]}', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        result = self.pipeline.to_dict()

        self.assertEqual(1, len(result['pipeline_callbacks']))
        self.assertEqual(callback_block.uuid, result['pipeline_callbacks'][0]['uuid'])

    def test_load_config_with_pipeline_callbacks(self):
        callback_block = CallbackBlock.create(f'pipeline_cb_{uuid4().hex[:8]}', self.repo_path)
        self.pipeline.add_block(callback_block, pipeline_callback=True)

        reloaded = Pipeline(self.pipeline.uuid, repo_path=self.repo_path)

        self.assertIn(callback_block.uuid, reloaded.pipeline_callbacks_by_uuid)
        self.assertEqual(1, len(reloaded.pipeline_callbacks_by_uuid))

    def test_execute_pipeline_callbacks_on_success(self):
        mock_callback_block = MagicMock()
        mock_callback_block.uuid = 'mock_pipeline_cb'
        self.pipeline.pipeline_callbacks_by_uuid = dict(
            mock_pipeline_cb=mock_callback_block,
        )

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
        self.assertEqual(
            'on_success',
            mock_callback_block.execute_callback.call_args[0][0],
        )

    def test_execute_pipeline_callbacks_handles_exception(self):
        mock_callback_block = MagicMock()
        mock_callback_block.uuid = 'failing_cb'
        mock_callback_block.execute_callback.side_effect = Exception('callback error')
        self.pipeline.pipeline_callbacks_by_uuid = dict(
            failing_cb=mock_callback_block,
        )

        self.pipeline.execute_pipeline_callbacks(
            'on_failure',
            callback_kwargs=dict(__error=Exception('pipeline failed')),
        )

    def test_regular_callback_not_in_pipeline_callbacks(self):
        block = Block.create(
            f'test_loader_{uuid4().hex[:8]}',
            'data_loader',
            self.repo_path,
            pipeline=self.pipeline,
        )
        self.pipeline.add_block(block)

        callback_block = CallbackBlock.create(f'block_level_cb_{uuid4().hex[:8]}', self.repo_path)
        self.pipeline.add_block(
            callback_block,
            upstream_block_uuids=[block.uuid],
        )

        self.assertIn(callback_block.uuid, self.pipeline.callbacks_by_uuid)
        self.assertNotIn(callback_block.uuid, self.pipeline.pipeline_callbacks_by_uuid)
