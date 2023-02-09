from async_timeout import asyncio
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_preparation.models.block import Block, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.tests.base_test import DBTestCase
from pandas.testing import assert_frame_equal
import os
import pandas as pd


class BlockTest(DBTestCase):
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
        pipeline = Pipeline.create(
            'test pipeline',
            repo_path=self.repo_path,
        )
        block1 = Block.create('test_data_loader', 'data_loader', self.repo_path, pipeline=pipeline)
        block2 = Block.create(
            'test_transformer',
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=['test_data_loader'],
        )
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
@transformer
def remove_duplicate_rows(df):
    df_transformed = df.drop_duplicates()
    return [df_transformed]
            ''')
        asyncio.run(block1.execute(analyze_outputs=True))
        asyncio.run(block2.execute(analyze_outputs=True))

        variable_manager = VariableManager(
            variables_dir=get_repo_config(self.repo_path).variables_dir,
        )
        data = variable_manager.get_variable(
            pipeline.uuid,
            block2.uuid,
            'output_0',
            variable_type='dataframe'
        )
        analysis = variable_manager.get_variable(
            pipeline.uuid,
            block2.uuid,
            'output_0',
            variable_type='dataframe_analysis',
        )
        df_final = pd.DataFrame({'col1': [1, 1, 3], 'col2': [2, 2, 4]}).drop_duplicates()
        assert_frame_equal(data, df_final)
        self.assertEqual(
            analysis['metadata']['column_types'],
            dict(col1=ColumnType.TRUE_OR_FALSE, col2=ColumnType.TRUE_OR_FALSE),
        )
        self.assertTrue(len(analysis['statistics']) > 0)
        self.assertTrue(len(analysis['insights']) > 0)

    def test_execute_dicts_and_lists(self):
        pipeline = Pipeline.create(
            'test_pipeline_execute_dicts_and_lists',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_2',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block2 = Block.create(
            'test_transformer_2',
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=['test_data_loader_2'],
        )
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {
        'col1': [1, 1, 3],
        'col2': [2, 2, 4],
        'col3': [dict(mage=1), dict(mage=2), dict(mage=3)],
        'col4': [[dict(mage=1)], [dict(mage=2)], [dict(mage=3)]],
    }
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block2.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def remove_duplicate_rows(df):
    df_transformed = df
    return [df_transformed]
            ''')
        asyncio.run(block1.execute())
        asyncio.run(block2.execute())

        variable_manager = VariableManager(
            variables_dir=get_repo_config(self.repo_path).variables_dir,
        )
        data = variable_manager.get_variable(
            pipeline.uuid,
            block2.uuid,
            'output_0',
            variable_type='dataframe'
        )
        df_final = pd.DataFrame({
            'col1': [1, 1, 3],
            'col2': [2, 2, 4],
            'col3': [dict(mage=1), dict(mage=2), dict(mage=3)],
            'col4': [[dict(mage=1)], [dict(mage=2)], [dict(mage=3)]],
        })
        assert_frame_equal(data, df_final)

    def test_execute_multiple_upstream_blocks(self):
        pipeline = Pipeline.create(
            'test pipeline 2',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block2 = Block.create(
            'test_data_loader_2',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block3 = Block.create(
            'test_transformer',
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=['test_data_loader_1', 'test_data_loader_2'],
        )
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block2.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [5], 'col2': [6]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block3.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def union_datasets(df1, df2):
    df_union = pd.concat([df1, df2]).reset_index(drop=True)
    return [df_union]
            ''')
        asyncio.run(block1.execute(analyze_outputs=True))
        asyncio.run(block2.execute(analyze_outputs=True))
        asyncio.run(block3.execute(analyze_outputs=True))

        variable_manager = VariableManager(
            variables_dir=get_repo_config(self.repo_path).variables_dir,
        )
        data = variable_manager.get_variable(
            pipeline.uuid,
            block3.uuid,
            'output_0',
            variable_type='dataframe'
        )
        analysis = variable_manager.get_variable(
            pipeline.uuid,
            block3.uuid,
            'output_0',
            variable_type='dataframe_analysis',
        )
        df_final = pd.concat([
            pd.DataFrame({'col1': [1, 3], 'col2': [2, 4]}),
            pd.DataFrame({'col1': [5], 'col2': [6]}),
        ]).reset_index(drop=True)

        assert_frame_equal(data, df_final)
        self.assertEqual(
            analysis['metadata']['column_types'],
            dict(col1=ColumnType.NUMBER, col2=ColumnType.NUMBER),
        )
        self.assertTrue(len(analysis['statistics']) > 0)
        self.assertTrue(len(analysis['insights']) > 0)
        self.assertTrue(len(analysis['suggestions']) == 0)

    def test_execute_validation(self):
        pipeline = Pipeline.create(
            'test pipeline 3',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block2 = Block.create(
            'test_data_loader_2',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block3 = Block.create(
            'test_transformer',
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=['test_data_loader_1', 'test_data_loader_2'],
        )
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block2.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [5], 'col2': [6]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        with open(block3.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def incorrect_function(df1):
    return df1
            ''')
        asyncio.run(block1.execute())
        asyncio.run(block2.execute())
        with self.assertRaises(Exception):
            asyncio.run(block3.execute())

        with open(block3.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def incorrect_function(df1, df2, df3):
    return df1
            ''')
        with self.assertRaises(Exception):
            asyncio.run(block3.execute())

    def test_to_dict(self):
        block1 = Block.create(
            'test_transformer_2',
            'transformer',
            self.repo_path,
            language='sql',
        )
        block2 = Block.create(
            'test_data_exporter',
            'data_exporter',
            self.repo_path,
            language='python',
        )
        block2.upstream_blocks = [block1]
        block1.downstream_blocks = [block2]
        self.assertEqual(block1.to_dict(), dict(
            all_upstream_blocks_executed=True,
            configuration={},
            downstream_blocks=['test_data_exporter'],
            executor_config=None,
            executor_type='local_python',
            language='sql',
            name='test_transformer_2',
            status='not_executed',
            type='transformer',
            upstream_blocks=[],
            uuid='test_transformer_2',
        ))
        self.assertEqual(block2.to_dict(), dict(
            all_upstream_blocks_executed=False,
            configuration={},
            downstream_blocks=[],
            executor_config=None,
            executor_type='local_python',
            language='python',
            name='test_data_exporter',
            status='not_executed',
            type='data_exporter',
            upstream_blocks=['test_transformer_2'],
            uuid='test_data_exporter',
        ))
