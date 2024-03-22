import os
from unittest.mock import patch

import pandas as pd
from async_timeout import asyncio
from faker import Faker
from pandas.testing import assert_frame_equal

# from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_preparation.models.block import Block, BlockType, CallbackBlock
from mage_ai.data_preparation.models.block.block_factory import BlockFactory
from mage_ai.data_preparation.models.block.errors import HasDownstreamDependencies
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_integration_pipeline_with_blocks,
    create_pipeline,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class BlockTest(DBTestCase):
    def test_create(self):
        block1 = Block.create('test_transformer', 'transformer', self.repo_path)
        block2 = Block.create('test data loader', BlockType.DATA_LOADER, self.repo_path)
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path, 'transformers', 'test_transformer.py')))
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path, 'transformers', '__init__.py')))
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path, 'data_loaders', 'test_data_loader.py')))
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path, 'data_loaders', '__init__.py')))
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
        # analysis = variable_manager.get_variable(
        #     pipeline.uuid,
        #     block2.uuid,
        #     'output_0',
        #     variable_type='dataframe_analysis',
        # )
        df_final = pd.DataFrame({'col1': [1, 1, 3], 'col2': [2, 2, 4]}).drop_duplicates()
        assert_frame_equal(data, df_final)
        # TODO (Xiaoyou Wang): uncomment this one serialization of block output is fixed.
        # self.assertEqual(
        #     analysis['metadata']['column_types'],
        #     dict(col1=ColumnType.TRUE_OR_FALSE, col2=ColumnType.TRUE_OR_FALSE),
        # )
        # self.assertTrue(len(analysis['statistics']) > 0)
        # self.assertTrue(len(analysis['insights']) > 0)

    def test_execute_with_preprocessers(self):
        pipeline = Pipeline.create(
            'test pipeline preprocessers',
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
@preprocesser
def preprocesser0(*args, **kwargs):
    kwargs['context']['count'] = 1


@preprocesser
def preprocesser1(*args, **kwargs):
    kwargs['context']['count'] = kwargs['context']['count'] + 1


@data_loader
def load_data(**kwargs):
    count = kwargs['context']['count']

    data = {'col1': [i * count for i in [1, 1, 3]], 'col2': [i * count for i in [2, 2, 4]]}
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

        df_final = pd.DataFrame({'col1': [2, 2, 6], 'col2': [4, 4, 8]}).drop_duplicates()
        assert_frame_equal(data, df_final)

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

        analysis
        # TODO (Xiaoyou Wang): uncomment this one serialization of block output is fixed.
        # self.assertEqual(
        #     analysis['metadata']['column_types'],
        #     dict(col1=ColumnType.NUMBER, col2=ColumnType.NUMBER),
        # )
        # self.assertTrue(len(analysis['statistics']) > 0)
        # self.assertTrue(len(analysis['insights']) > 0)
        # self.assertTrue(len(analysis['suggestions']) == 0)

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
        with self.assertRaisesRegex(
            Exception,
            'Block test_transformer may have too many upstream dependencies. It expected to have' +
            ' 1 arguments, but received 2. Confirm that the @transformer method declaration has ' +
            'the correct number of arguments.'
        ):
            asyncio.run(block3.execute())

        with open(block3.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def incorrect_function(df1, df2, df3):
    return df1
            ''')
        with self.assertRaisesRegex(
            Exception,
            'Block test_transformer may have too many upstream dependencies. It expected to have' +
            ' 1 arguments, but received 2. Confirm that the @transformer method declaration has ' +
            'the correct number of arguments.'
        ):
            asyncio.run(block3.execute())

    def test_sensor_block_args_execution(self):
        pipeline = Pipeline.create(
            'test pipeline 7',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        block2 = Block.create(
            'test_sensor',
            'sensor',
            self.repo_path,
            pipeline=pipeline,
        )
        block2.upstream_blocks = [block1]
        block1.downstream_blocks = [block2]
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
@sensor
def sensor(*args):
    df = args[0]
    return df is not None
            ''')
        asyncio.run(block1.execute())
        output = block2.execute_sync(from_notebook=True)
        self.assertEqual(output['output'][0], True)

    @patch('builtins.print')
    def test_execute_with_callback_success(self, mock_print):
        pipeline = Pipeline.create(
            'test pipeline 4',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        block1.update(dict(has_callback=True))
        with open(block1.callback_block.file_path, 'w') as file:
            file.write('''
@on_success
def on_success_callback(**kwargs):
    print('SUCCESS')
            ''')
        block1.execute_with_callback()
        mock_print.assert_called_with('SUCCESS')

    @patch('builtins.print')
    def test_execute_with_callback_failure(self, mock_print):
        pipeline = Pipeline.create(
            'test pipeline 5',
            repo_path=self.repo_path,
        )
        block1 = Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        with open(block1.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    raise Exception('failed')
            ''')
        block1.update(dict(has_callback=True))
        with open(block1.callback_block.file_path, 'w') as file:
            file.write('''
@on_failure
def on_failure_callback(**kwargs):
    print('FAILED')
            ''')

        with self.assertRaisesRegex(Exception, 'failed'):
            block1.execute_with_callback()
            mock_print.assert_called_with('FAILED')

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
            color=None,
            configuration={},
            downstream_blocks=['test_data_exporter'],
            executor_config=None,
            executor_type='local_python',
            has_callback=False,
            language='sql',
            name='test_transformer_2',
            retry_config=None,
            status='not_executed',
            timeout=None,
            type='transformer',
            upstream_blocks=[],
            uuid='test_transformer_2',
        ))
        self.assertEqual(block2.to_dict(), dict(
            all_upstream_blocks_executed=False,
            color=None,
            configuration={},
            downstream_blocks=[],
            executor_config=None,
            executor_type='local_python',
            has_callback=False,
            language='python',
            name='test_data_exporter',
            retry_config=None,
            status='not_executed',
            timeout=None,
            type='data_exporter',
            upstream_blocks=['test_transformer_2'],
            uuid='test_data_exporter',
        ))

    def test_full_table_name(self):
        faker = Faker()
        pipeline = Pipeline.create(faker.name(), repo_path=self.repo_path)
        block = Block.create(faker.name(), 'data_loader', self.repo_path, pipeline=pipeline)

        def get_block():
            return Pipeline.get(pipeline.uuid).get_block(block.uuid)

        with open(block.file_path, 'w') as file:
            file.write('')
        self.assertEqual(get_block().full_table_name, None)

        with open(block.file_path, 'w') as file:
            file.write("""
CREATE TABLE mage.users_v1 (
    id BIGINT
);
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v1')

        with open(block.file_path, 'w') as file:
            file.write("""
CREATE TABLE mage.users_v1 (
    id BIGINT
);

INSERT INTO mage.users_v2
SELECT 1 AS id;
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v1')

        with open(block.file_path, 'w') as file:
            file.write("""
INSERT INTO mage.users_v2
SELECT 1 AS id;
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v2')

        with open(block.file_path, 'w') as file:
            file.write("""
INSERT INTO mage.users_v2
SELECT 1 AS id;

INSERT INTO mage.users_v3
SELECT 1 AS id;
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v3')

        with open(block.file_path, 'w') as file:
            file.write("""
INSERT mage.users_v2
SELECT 1 AS id;
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v2')

        with open(block.file_path, 'w') as file:
            file.write("""
INSERT OVERWRITE INTO mage.users_v2
SELECT 1 AS id;
""")
        self.assertEqual(get_block().full_table_name, 'mage.users_v2')

    def test_delete(self):
        pipeline = Pipeline.create(
            'test pipeline delete',
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

        self.assertRaises(HasDownstreamDependencies, block1.delete)

        block2.delete()
        self.assertIsNone(pipeline.get_block('test_transformer'))

    def test_delete_force(self):
        pipeline = Pipeline.create(
            'test_pipeline_delete_force',
            repo_path=self.repo_path,
        )
        block1 = Block.create('test_data_loader', 'data_loader', self.repo_path, pipeline=pipeline)
        Block.create(
            'test_transformer',
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=['test_data_loader'],
        )

        test_block = BlockFactory.get_block('test_data_loader', 'test_data_loader', 'data_loader')

        self.assertRaises(HasDownstreamDependencies, block1.delete)
        self.assertRaises(HasDownstreamDependencies, test_block.delete)

        test_block.delete(force=True)

        pipeline = Pipeline.get('test_pipeline_delete_force')
        self.assertIsNone(pipeline.get_block('test_data_loader'))

        block2 = pipeline.get_block('test_transformer')
        self.assertEqual([], block2.upstream_block_uuids)

    def test_execute_block_from_notebook(self):
        pipeline = Pipeline.create(
            'test_pipeline_execute_block_function_from_notebook',
            repo_path=self.repo_path,
        )
        block = Block.create('test_data_loader', 'data_loader', self.repo_path, pipeline=pipeline)

        with open(block.file_path, 'w') as file:
            file.write("""import pandas as pd
if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader

@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return df
""")

        output = block._execute_block(dict(), from_notebook=True)
        self.assertIsNotNone(block.module)
        self.assertEqual(len(output), 1)

    def test_execute_block_from_notebook_no_decorator_definition(self):
        pipeline = Pipeline.create(
            'test_pipeline_execute_block_function_from_notebook_no_decorator_definition',
            repo_path=self.repo_path,
        )
        block = Block.create('test_data_loader', 'data_loader', self.repo_path, pipeline=pipeline)

        with open(block.file_path, 'w') as file:
            file.write("""import pandas as pd

@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return df

@test
def test_output(output, *args) -> None:
    assert output is not None, 'The output is undefined'
""")

        output = block._execute_block(dict(), from_notebook=True)
        self.assertIsNotNone(block.module)
        self.assertEqual(len(output), 1)

    def test_update_upstream_blocks_order(self):
        pipeline = Pipeline.create(
            'test pipeline 8',
            repo_path=self.repo_path,
        )
        Block.create(
            'test_data_loader_1',
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
        )
        Block.create(
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
        self.assertEqual(
            block3.upstream_block_uuids[0],
            'test_data_loader_1',
        )
        self.assertEqual(
            block3.upstream_block_uuids[1],
            'test_data_loader_2',
        )
        block3.update(
            dict(upstream_blocks=['test_data_loader_2', 'test_data_loader_1']),
            check_upstream_block_order=True,
        )
        self.assertEqual(
            block3.upstream_block_uuids[0],
            'test_data_loader_2',
        )
        self.assertEqual(
            block3.upstream_block_uuids[1],
            'test_data_loader_1',
        )

    def test_output_variables_for_integration_pipeline_blocks(self):
        pipeline = create_integration_pipeline_with_blocks(
            'test integration pipeline',
            repo_path=self.repo_path,
        )
        block = pipeline.get_block('test_integration_source')

        df = pd.DataFrame(
            [
                [1, 'abc@xyz.com', '32132'],
                [2, 'abc2@xyz.com', '12345'],
                [3, 'test', '1234'],
                [4, 'abc@test.net', 'abcde'],
                [5, 'abc12345@', '54321'],
                [6, 'abcdef@123.com', '56789'],
            ],
            columns=['id', 'email', 'zip_code'],
        )

        block.store_variables({
            'output_sample_data_stream1': df
        })
        output_variables = block.output_variables()
        self.assertTrue('output_sample_data_stream1' in output_variables)

    def test_file_path(self):
        block = Block.create('test_transformer', 'transformer', self.repo_path)
        self.assertEqual(block.file_path, os.path.join(
            self.repo_path,
            'transformers',
            f'{block.uuid}.py',
        ))


class BlockProjectPlatformTests(ProjectPlatformMixin):
    def test_file_path(self):
        path = os.path.join('mage_platform', 'transformers', 'test_transformer.py')

        with patch(
            'mage_ai.data_preparation.models.block.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.block.platform.mixins.project_platform_activated',
                lambda: True,
            ):
                block = Block.create(
                    'test_transformer',
                    'transformer',
                    self.repo_path,
                    configuration=dict(file_source=dict(path=path))
                )

                self.assertEqual(block.file_path, add_root_repo_path_to_relative_path(path))


class CallbackBlockTest(DBTestCase):
    def setUp(self):
        self.pipeline = create_pipeline('callback_pipeline', self.repo_path)

    def tearDown(self):
        self.pipeline.delete()

    def test_create_global_vars_from_parent_block(self):
        parent_block = Block.create(
            'test_data_loader',
            'data_loader',
            self.repo_path,
            pipeline=self.pipeline,
        )
        callback_block = CallbackBlock.create(parent_block.name)
        self.pipeline.add_block(callback_block)
        parent_block = parent_block.update(
            dict(callback_blocks=[callback_block.uuid])
        )
        parent_block.global_vars = dict(
            configuration=dict(table_name='load_data_table')
        )

        global_vars = dict(
            random_var=1,
        )
        new_vars = callback_block._create_global_vars(
            global_vars,
            parent_block=parent_block,
        )

        self.assertIsNotNone(new_vars.get('configuration'))
