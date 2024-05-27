import json
import os
from unittest.mock import patch

import numpy as np
import pandas as pd
import polars as pl
from pandas.testing import assert_frame_equal
from polars.testing import assert_frame_equal as assert_polars_frame_equal

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.constants import (
    VariableAggregateDataTypeFilename,
    VariableType,
)
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline
from mage_ai.tests.test_shared import (
    build_iterable,
    build_list_complex,
    build_matrix_sparse,
    build_pandas,
    build_pandas_series,
    build_polars,
    build_polars_series,
)


class VariableTest(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline(self.faker.unique.name(), self.repo_path)

    def test_write_and_read_data(self):
        pipeline = self.__create_pipeline('test pipeline 1')
        variable1 = Variable('var1', pipeline.dir_path, 'block1')
        variable2 = Variable('var2', pipeline.dir_path, 'block1')
        variable3 = Variable('var3', pipeline.dir_path, 'block2')
        variable4 = Variable('var4', pipeline.dir_path, 'block2')
        variable1.write_data('test')
        variable2.write_data(123)
        variable3.write_data([1, 2, 3, 4])
        variable4.write_data({'k1': 'v1', 'k2': 'v2'})
        self.assertEqual(variable1.read_data(), 'test')
        self.assertEqual(variable2.read_data(), 123)
        self.assertEqual(variable3.read_data(), [1, 2, 3, 4])
        self.assertEqual(variable4.read_data(), {'k1': 'v1', 'k2': 'v2'})

    def test_write_and_read_dataframe(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            with patch('mage_ai.data.models.manager.DataManager.readable', return_value=False):
                pipeline = self.__create_pipeline('test pipeline 2')
                variable1 = Variable(
                    'var1',
                    pipeline.dir_path,
                    'block1',
                    variable_type=VariableType.DATAFRAME,
                )
                variable2 = Variable('var2', pipeline.dir_path, 'block2')
                df1 = pd.DataFrame(
                    [
                        [1, 'test'],
                        [2, 'test2'],
                    ],
                    columns=['col1', 'col2'],
                )
                df2 = pd.DataFrame(
                    [
                        [1, 'test', 3.123, np.NaN],
                        [2, 'test2', 4.321, np.NaN],
                    ],
                    columns=['col1', 'col2', 'col3', 'col4'],
                )
                df2['col4'] = df2['col4'].astype('Int64')
                variable1.write_data(df1)
                variable2.write_data(df2)
                variable_dir_path = os.path.join(pipeline.dir_path, '.variables')
                self.assertTrue(
                    os.path.exists(
                        os.path.join(variable_dir_path, 'block1', 'var1', 'data.parquet'),
                    )
                )
                self.assertTrue(
                    os.path.exists(
                        os.path.join(variable_dir_path, 'block1', 'var1', 'sample_data.parquet'),
                    )
                )
                self.assertTrue(
                    os.path.exists(
                        os.path.join(variable_dir_path, 'block2', 'var2', 'data.parquet'),
                    )
                )
                self.assertTrue(
                    os.path.exists(
                        os.path.join(variable_dir_path, 'block2', 'var2', 'sample_data.parquet'),
                    )
                )
                assert_frame_equal(variable1.read_data(), df1)
                assert_frame_equal(variable1.read_data(sample=True, sample_count=1), df1.iloc[:1])
                assert_frame_equal(variable2.read_data(), df2)
                assert_frame_equal(variable2.read_data(sample=True, sample_count=1), df2.iloc[:1])

    def test_write_and_read_dataframe_analysis(self):
        pipeline = self.__create_pipeline('test pipeline 3')
        variable = Variable(
            'var1',
            pipeline.dir_path,
            'block1',
            variable_type=VariableType.DATAFRAME_ANALYSIS,
        )
        data = dict(
            metadata=dict(
                column_types=dict(
                    col1='number',
                    col2='text',
                ),
            ),
            statistics=dict(
                count=100,
                count_distinct=50,
            ),
            insights=dict(),
            suggestions=[
                dict(
                    title='Remove outliers',
                )
            ],
        )
        variable.write_data(data)
        self.assertEqual(variable.read_data(), data)

    def test_write_and_read_json(self):
        pipeline = self.__create_pipeline('test pipeline 4')
        variable = Variable(
            'var1',
            pipeline.dir_path,
            'block1',
        )
        data = dict(
            results=[100] * 100,
        )
        variable.write_data(data)
        self.assertTrue(
            os.path.exists(
                os.path.join(
                    self.repo_path,
                    'pipelines/test_pipeline_4/.variables/block1/var1/data.json',
                )
            )
        )
        self.assertTrue(
            os.path.exists(
                os.path.join(
                    self.repo_path,
                    'pipelines/test_pipeline_4/.variables/block1/var1/sample_data.json',
                )
            )
        )
        self.assertEqual(variable.read_data(), data)
        self.assertEqual(
            variable.read_data(sample=True),
            dict(
                results=[100] * 20,
            ),
        )

    def test_write_and_read_polars_dataframe(self):
        pipeline = self.__create_pipeline('test pipeline polars')
        variable1 = Variable(
            'polars1',
            pipeline.dir_path,
            'block1',
        )
        variable2 = Variable('polars2', pipeline.dir_path, 'block2')
        df1 = pl.DataFrame(
            [
                [1, 'test'],
                [2, 'test2'],
            ],
            schema=['col1', 'col2'],
        )
        df2 = pl.DataFrame(
            [
                [1, 'test', 3.123, 41414123123124],
                [2, 'test2', 4.321, 12111111],
            ],
            schema=['col1', 'col2', 'col3', 'col4'],
        )
        df2 = df2.cast({'col4': pl.Int64})
        variable1.write_data(df1)
        variable2.write_data(df2)
        variable_dir_path = os.path.join(pipeline.dir_path, '.variables')
        self.assertTrue(
            os.path.exists(
                os.path.join(variable_dir_path, 'block1', 'polars1', 'data.parquet'),
            )
        )
        self.assertTrue(
            os.path.exists(
                os.path.join(variable_dir_path, 'block1', 'polars1', 'sample_data.parquet'),
            )
        )
        self.assertTrue(
            os.path.exists(
                os.path.join(variable_dir_path, 'block2', 'polars2', 'data.parquet'),
            )
        )
        self.assertTrue(
            os.path.exists(
                os.path.join(variable_dir_path, 'block2', 'polars2', 'sample_data.parquet'),
            )
        )
        assert_polars_frame_equal(variable1.read_data(), df1)
        assert_polars_frame_equal(variable1.read_data(sample=True, sample_count=1), df1.head(1))
        assert_polars_frame_equal(variable2.read_data(), df2)
        assert_polars_frame_equal(variable2.read_data(sample=True, sample_count=1), df2.head(1))

    def test_write_statistics_for_pandas_dataframe(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            data = build_pandas()
            variable = Variable(
                'var_pandas',
                self.pipeline.dir_path,
                'block_pandas',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], 1_000)

    def test_write_statistics_for_pandas_series(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            data = build_pandas_series()
            variable = Variable(
                'var_pandas_series',
                self.pipeline.dir_path,
                'block_pandas_series',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], 2_000)

    def test_write_statistics_for_polars_dataframe(self):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
        ):
            with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=True):
                data = build_polars()
                variable = Variable(
                    'var_polars',
                    self.pipeline.dir_path,
                    'block_polars',
                    variable_type=infer_variable_type(data)[0],
                )
                variable.write_data(data)
                with open(
                    os.path.join(
                        variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS
                    ),
                    'r',
                ) as f:
                    self.assertEqual(json.load(f)['original_row_count'], 3_000)

    def test_write_statistics_for_polars_series(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=True):
            data = build_polars_series()
            variable = Variable(
                'var_polars_series',
                self.pipeline.dir_path,
                'block_polars_series',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], 4_000)

    def test_write_statistics_for_iterable(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            data = build_iterable()
            variable = Variable(
                'var_iterable',
                self.pipeline.dir_path,
                'block_iterable',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], 5_000)

    def test_write_statistics_for_sparse_matrix(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            data = build_matrix_sparse()
            variable = Variable(
                'var_sparse_matrix',
                self.pipeline.dir_path,
                'block_sparse_matrix',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], 6_000)

    def test_write_statistics_for_list_complex(self):
        with patch('mage_ai.data.models.manager.DataManager.writeable', return_value=False):
            data = build_list_complex()
            variable = Variable(
                'var_list_complex',
                self.pipeline.dir_path,
                'block_list_complex',
                variable_type=infer_variable_type(data)[0],
            )
            variable.write_data(data)
            # 100 for the data generator
            # 6 for the other objects
            row_count = 106
            with open(
                os.path.join(variable.variable_path, VariableAggregateDataTypeFilename.STATISTICS),
                'r',
            ) as f:
                self.assertEqual(json.load(f)['original_row_count'], row_count)

    def __create_pipeline(self, name):
        pipeline = Pipeline.create(
            name,
            repo_path=self.repo_path,
        )
        block1 = Block.create('block1', 'data_loader', self.repo_path)
        block2 = Block.create('block2', 'transformer', self.repo_path)
        pipeline.add_block(block1)
        pipeline.add_block(block2)
        return pipeline
