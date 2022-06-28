from mage_ai.data_preparation.models.block import Block, BlockType
from mage_ai.tests.base_test import TestCase
import os
import shutil


class BlockTest(TestCase):
    def setUp(self):
        self.repo_path = os.getcwd() + '/test'
        if not os.path.exists(self.repo_path):
            os.mkdir(self.repo_path)
        return super().setUp()

    def tearDown(self):
        shutil.rmtree(self.repo_path)
        return super().tearDown()

    def test_create(self):
        block1 = Block.create('test_transformer', 'transformer', self.repo_path)
        block2 = Block.create('test data loader', BlockType.DATA_LOADER, self.repo_path)
        self.assertTrue(os.path.exists(f'{self.repo_path}/transformers/test_transformer.py'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/transformers/__init__.py'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/data_loaders/test_data_loader.py'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/data_loaders/__init__.py'))
        self.assertEqual(block1.name, 'test_transformer')
        self.assertEqual(block1.uuid, 'test_transformer')
        self.assertEqual(block1.type, 'transformer')
        self.assertEqual(block2.name, 'test data loader')
        self.assertEqual(block2.uuid, 'test_data_loader')
        self.assertEqual(block2.type, 'data_loader')

    def test_to_dict(self):
        block1 = Block.create('test_transformer_2', 'transformer', self.repo_path)
        block2 = Block.create('test_data_exporter', 'data_exporter', self.repo_path)
        block2.upstream_blocks = [block1]
        block1.downstream_blocks = [block2]
        self.assertEqual(block1.to_dict(), dict(
            name='test_transformer_2',
            uuid='test_transformer_2',
            type='transformer',
            status='not_executed',
            upstream_blocks=[],
            downstream_blocks=['test_data_exporter'],
        ))
        self.assertEqual(block2.to_dict(), dict(
            name='test_data_exporter',
            uuid='test_data_exporter',
            type='data_exporter',
            status='not_executed',
            upstream_blocks=['test_transformer_2'],
            downstream_blocks=[],
        ))
