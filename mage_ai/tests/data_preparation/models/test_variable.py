import os

import numpy as np
import pandas as pd
import polars as pl
from pandas.testing import assert_frame_equal
from polars.testing import assert_frame_equal as assert_polars_frame_equal

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import Variable, VariableType
from mage_ai.tests.base_test import DBTestCase


class VariableTest(DBTestCase):
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
            columns=['col1', 'col2']
        )
        df2 = pd.DataFrame(
            [
                [1, 'test', 3.123, np.NaN],
                [2, 'test2', 4.321, np.NaN],
            ],
            columns=['col1', 'col2', 'col3', 'col4']
        )
        df2['col4'] = df2['col4'].astype('Int64')
        variable1.write_data(df1)
        variable2.write_data(df2)
        variable_dir_path = os.path.join(pipeline.dir_path, '.variables')
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block1', 'var1', 'data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block1', 'var1', 'sample_data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block2', 'var2', 'data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block2', 'var2', 'sample_data.parquet'),
        ))
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
            ]
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
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path,
            'pipelines/test_pipeline_4/.variables/block1/var1/data.json'
        )))
        self.assertTrue(os.path.exists(os.path.join(
            self.repo_path,
            'pipelines/test_pipeline_4/.variables/block1/var1/sample_data.json'
        )))
        self.assertEqual(variable.read_data(), data)
        self.assertEqual(variable.read_data(sample=True), dict(
            results=[100] * 20,
        ))

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
            schema=['col1', 'col2']
        )
        df2 = pl.DataFrame(
            [
                [1, 'test', 3.123, 41414123123124],
                [2, 'test2', 4.321, 12111111],
            ],
            schema=['col1', 'col2', 'col3', 'col4']
        )
        df2 = df2.cast({'col4': pl.Int64})
        variable1.write_data(df1)
        variable2.write_data(df2)
        variable_dir_path = os.path.join(pipeline.dir_path, '.variables')
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block1', 'polars1', 'data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block1', 'polars1', 'sample_data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block2', 'polars2', 'data.parquet'),
        ))
        self.assertTrue(os.path.exists(
            os.path.join(variable_dir_path, 'block2', 'polars2', 'sample_data.parquet'),
        ))
        assert_polars_frame_equal(variable1.read_data(), df1)
        assert_polars_frame_equal(variable1.read_data(sample=True, sample_count=1), df1.head(1))
        assert_polars_frame_equal(variable2.read_data(), df2)
        assert_polars_frame_equal(variable2.read_data(sample=True, sample_count=1), df2.head(1))

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
