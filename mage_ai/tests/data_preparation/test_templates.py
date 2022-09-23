from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.io.base import DataSource
from mage_ai.data_preparation.models.block import BlockType
from mage_ai.data_preparation.templates.template import (
    build_template_from_suggestion,
    fetch_template_source,
)
from mage_ai.tests.base_test import TestCase


class TemplateTest(TestCase):
    def test_template_creation(self):
        suggestion = dict(
            title='Remove rows with missing entries',
            message='Delete 3 rows to remove all missing values from the dataset.',
            action_payload=dict(
                action_type='filter',
                action_arguments=['state', 'location'],
                action_options={},
                action_variables=dict(
                    state=dict(feature=dict(column_type='category', uuid='state'), type='feature'),
                    location=dict(
                        feature=dict(column_type='zip_code', uuid='location'), type='feature'
                    ),
                ),
                action_code='state != null and location != null',
                axis='row',
                outputs=[],
            ),
            status='not_applied',
        )
        expected_string = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def remove_rows_with_missing_entries(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Transformer Action: Delete 3 rows to remove all missing values from the dataset.
    \"\"\"
    action = {
        "action_type": "filter",
        "action_arguments": [
            "state",
            "location"
        ],
        "action_options": {},
        "action_variables": {
            "state": {
                "feature": {
                    "column_type": "category",
                    "uuid": "state"
                },
                "type": "feature"
            },
            "location": {
                "feature": {
                    "column_type": "zip_code",
                    "uuid": "location"
                },
                "type": "feature"
            }
        },
        "action_code": "state != null and location != null",
        "axis": "row",
        "outputs": []
    }
    return BaseAction(action).execute(df)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""
        new_string = build_template_from_suggestion(suggestion)
        self.assertEqual(expected_string, new_string)

    def test_template_generation_data_loader_default(self):
        expected_template = """from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_data(**kwargs) -> DataFrame:
    \"\"\"
    Template code for loading data from any source.

    Returns:
        DataFrame: Returned pandas data frame.
    \"\"\"
    # Specify your data loading logic here

    return DataFrame({})


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config1 = {'data_source': 'default'}
        config2 = {}
        new_template1 = fetch_template_source(BlockType.DATA_LOADER, config1)
        new_template2 = fetch_template_source(BlockType.DATA_LOADER, config2)
        self.assertEqual(expected_template, new_template1)
        self.assertEqual(expected_template, new_template2)

    def test_template_generation_data_loader_specific(self):
        redshift_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.redshift import Redshift
from os import path
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_data_from_redshift(**kwargs) -> DataFrame:
    \"\"\"
    Template for loading data from a Redshift cluster.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#redshift
    \"\"\"
    query = 'your_redshift_selection_query'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Redshift.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""
        s3_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.s3 import S3
from os import path
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_from_s3_bucket(**kwargs) -> DataFrame:
    \"\"\"
    Template for loading data from a S3 bucket.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#s3
    \"\"\"
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    bucket_name = 'your_bucket_name'
    object_key = 'your_object_key'

    return S3.with_config(ConfigFileLoader(config_path, config_profile)).load(
        bucket_name,
        object_key,
    )


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config1 = {'data_source': DataSource.REDSHIFT}
        config2 = {'data_source': DataSource.S3}
        new_redshift_template = fetch_template_source(BlockType.DATA_LOADER, config1)
        new_s3_template = fetch_template_source(BlockType.DATA_LOADER, config2)
        self.assertEqual(redshift_template, new_redshift_template)
        self.assertEqual(s3_template, new_s3_template)

    def test_template_generation_data_loader_api(self):
        expected_template = """import io
import pandas as pd
import requests
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_data_from_api(**kwargs) -> DataFrame:
    \"\"\"
    Template for loading data from API
    \"\"\"
    url = ''

    response = requests.get(url)
    return pd.read_csv(io.StringIO(response.text), sep=',')


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""
        config = {'data_source': DataSource.API}
        api_template = fetch_template_source(BlockType.DATA_LOADER, config)
        self.assertEqual(api_template, expected_template)

    def test_template_generation_transformer_default(self):
        expected_template = """from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def transform_df(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Template code for a transformer block.

    Add more parameters to this function if this block has multiple parent blocks.
    There should be one parameter for each output variable from each parent block.

    Args:
        df (DataFrame): Data frame from parent block.

    Returns:
        DataFrame: Transformed data frame
    \"\"\"
    # Specify your transformation logic here

    return df


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config1 = {'action_type': 'custom'}
        config2 = {'axis': 'row'}
        config3 = {}
        new_template1 = fetch_template_source(BlockType.TRANSFORMER, config1)
        new_template2 = fetch_template_source(BlockType.TRANSFORMER, config2)
        new_template3 = fetch_template_source(BlockType.TRANSFORMER, config3)
        self.assertEqual(expected_template, new_template1)
        self.assertEqual(expected_template, new_template2)
        self.assertEqual(expected_template, new_template3)

    def test_template_generation_transformer_action_default(self):
        expected_template = """from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def transform_df(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Template code for a transformer block.

    Add more parameters to this function if this block has multiple parent blocks.
    There should be one parameter for each output variable from each parent block.

    Args:
        df (DataFrame): Data frame from parent block.

    Returns:
        DataFrame: Transformed data frame
    \"\"\"
    # Specify your transformation logic here

    return df


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config1 = {'action_type': 'custom'}
        config2 = {'axis': 'row'}
        config3 = {}
        new_template1 = fetch_template_source(BlockType.TRANSFORMER, config1)
        new_template2 = fetch_template_source(BlockType.TRANSFORMER, config2)
        new_template3 = fetch_template_source(BlockType.TRANSFORMER, config3)
        self.assertEqual(expected_template, new_template1)
        self.assertEqual(expected_template, new_template2)
        self.assertEqual(expected_template, new_template3)

    def test_template_generation_transformer_action_simple(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Execute Transformer Action: ActionType.CLEAN_COLUMN_NAME

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#clean-column-names
    \"\"\"
    action = build_transformer_action(
        df,
        action_type=ActionType.CLEAN_COLUMN_NAME,
        arguments=df.columns,
        axis=Axis.COLUMN,
    )

    return BaseAction(action).execute(df)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config = {'action_type': ActionType.CLEAN_COLUMN_NAME, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_action_code(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Execute Transformer Action: ActionType.FILTER

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#filter
    \"\"\"
    action = build_transformer_action(
        df,
        action_type=ActionType.FILTER,
        axis=Axis.ROW,
        action_code='',  # Specify your filtering code here
    )

    return BaseAction(action).execute(df)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config = {'action_type': ActionType.FILTER, 'axis': Axis.ROW}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_action_options(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Execute Transformer Action: ActionType.REFORMAT

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#reformat-values
    \"\"\"
    action = build_transformer_action(
        df,
        action_type=ActionType.REFORMAT,
        arguments=[],  # Specify columns to reformat
        axis=Axis.COLUMN,
        options={'reformat': None},  # Specify reformat action,
    )

    return BaseAction(action).execute(df)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config = {'action_type': ActionType.REFORMAT, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_outputs(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    \"\"\"
    Execute Transformer Action: ActionType.FIRST

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#aggregation-actions
    \"\"\"
    action = build_transformer_action(
        df,
        action_type=ActionType.FIRST,
        action_code='',  # Enter filtering condition on rows before aggregation
        arguments=[],  # Enter the columns to compute aggregate over
        axis=Axis.COLUMN,
        options={'groupby_columns': []},  # Enter columns to group by
        outputs=[
            # The number of outputs below must match the number of arguments
            {'uuid': 'new_aggregate_column', 'column_type': 'category'},
        ],
    )

    return BaseAction(action).execute(df)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config = {'action_type': ActionType.FIRST, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_data_exporter_default(self):
        expected_template = """from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data(df: DataFrame, **kwargs):
    \"\"\"
    Exports data to some source

    Args:
        df (DataFrame): Data frame to export to

    Output (optional):
        Optionally return any object and it'll be logged and
        displayed when inspecting the block run.
    \"\"\"
    # Specify your data exporting logic here

"""

        config1 = {'data_source': 'default'}
        config2 = {}
        new_template1 = fetch_template_source(BlockType.DATA_EXPORTER, config1)
        new_template2 = fetch_template_source(BlockType.DATA_EXPORTER, config2)
        self.assertEqual(expected_template, new_template1)
        self.assertEqual(expected_template, new_template2)

    def test_template_generation_data_exporter_specific(self):
        bigquery_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.config import ConfigFileLoader
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_big_query(df: DataFrame, **kwargs) -> None:
    \"\"\"
    Template for exporting data to a BigQuery warehouse.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#bigquery
    \"\"\"
    table_id = 'your-project.your_dataset.your_table_name'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    BigQuery.with_config(ConfigFileLoader(config_path, config_profile)).export(
        df,
        table_id,
        if_exists='replace',  # Specify resolution policy if table name already exists
    )
"""
        snowflake_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.snowflake import Snowflake
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_snowflake(df: DataFrame, **kwargs) -> None:
    \"\"\"
    Template for exporting data to a Snowflake warehouse.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#snowflake
    \"\"\"
    table_name = 'your_table_name'
    database = 'your_database_name'
    schema = 'your_schema_name'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Snowflake.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        loader.export(
            df,
            table_name,
            database,
            schema,
            if_exists='replace',  # Specify resolution policy if table already exists
        )
"""

        config1 = {'data_source': DataSource.BIGQUERY}
        config2 = {'data_source': DataSource.SNOWFLAKE}
        new_bigquery_template = fetch_template_source(BlockType.DATA_EXPORTER, config1)
        new_snowflake_template = fetch_template_source(BlockType.DATA_EXPORTER, config2)
        self.assertEqual(bigquery_template, new_bigquery_template)
        self.assertEqual(snowflake_template, new_snowflake_template)

    def test_template_generation_transformer_dwh(self):
        postgres_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from os import path
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def transform_in_postgres(*args, **kwargs) -> DataFrame:
    \"\"\"
    Performs a transformation in Postgres
    \"\"\"
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    # Specify your SQL transformation query
    query = 'your transformation_query'

    # Specify table to sample data from. Use to visualize changes to table.
    sample_table = 'table_to_sample_data_from'
    sample_schema = 'schema_of_table_to_sample'
    sample_size = 10_000

    with Postgres.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        # Write queries to transform your dataset with
        loader.execute(query)
        loader.commit() # Permanently apply database changes
        return loader.sample(sample_schema, sample_size, sample_table)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        bigquery_template = """from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.bigquery import BigQuery
from os import path
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def transform_in_bigquery(*args, **kwargs) -> DataFrame:
    \"\"\"
    Performs a transformation in BigQuery
    \"\"\"
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    # Specify your SQL transformation query
    query = 'your transformation_query'

    # Specify table to sample data from. Use to visualize changes to table.
    sample_table = 'table_to_sample_data_from'
    sample_schema = 'schema_of_table_to_sample'
    sample_size = 10_000

    with BigQuery.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        # Write queries to transform your dataset with
        loader.execute(query)
        return loader.sample(sample_schema, sample_size, sample_table)


@test
def test_output(df) -> None:
    \"\"\"
    Template code for testing the output of the block.
    \"\"\"
    assert df is not None, 'The output is undefined'
"""

        config1 = {'data_source': DataSource.POSTGRES}
        config2 = {'data_source': DataSource.BIGQUERY}
        expected_postgres_template = fetch_template_source(BlockType.TRANSFORMER, config1)
        expected_bigquery_template = fetch_template_source(BlockType.TRANSFORMER, config2)
        self.assertEqual(postgres_template, expected_postgres_template)
        self.assertEqual(bigquery_template, expected_bigquery_template)
