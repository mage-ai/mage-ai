from async_timeout import asyncio
from mage_ai.data_preparation.models.block import Block, BlockType, DataLoaderBlock, TransformerBlock
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.variable_manager import VariableManager
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

    def test_execute(self):
        pipeline = Pipeline.create('test pipeline', self.repo_path)
        block1 = Block.create('test_data_loader', 'data_loader', self.repo_path, pipeline)
        block2 = Block.create('test_transformer', 'transformer', self.repo_path, pipeline)
        block2.upstream_blocks = [block1]
        block1.downstream_blocks = [block2]
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [1, 1, 3], 'col2': [2, 2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block2.file_path, 'w') as file:
            file.write('''import pandas as pd
from mage_ai.data_cleaner.transformer_actions.base import BaseAction

@transformer
def remove_duplicate_rows(df):
	df_transformed = df.drop_duplicates()
	return [df_transformed]
            ''')
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['test_data_loader'])
        asyncio.run(block1.execute())
        asyncio.run(block2.execute())

        variable_manager = VariableManager(pipeline.repo_path)
        data = variable_manager.get_variable(
            pipeline.uuid,
            block2.uuid,
            'df',
            variable_type='dataframe'
        )
        self.assertEqual(len(data.index), 2)

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
