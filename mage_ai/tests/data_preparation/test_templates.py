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


@transformer
def remove_rows_with_missing_entries(df: DataFrame) -> DataFrame:
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
"""
        new_string = build_template_from_suggestion(suggestion)
        self.assertEqual(expected_string, new_string)

    def test_template_generation_data_loader_default(self):
        expected_template = """from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data() -> DataFrame:
    \"\"\"
    Template code for loading data from any source.

    Returns:
        DataFrame: Returned pandas data frame.
    \"\"\"
    # Specify your data loading logic here
    return DataFrame({})
"""

        config1 = {'data_source': 'default'}
        config2 = {}
        new_template1 = fetch_template_source(BlockType.DATA_LOADER, config1)
        new_template2 = fetch_template_source(BlockType.DATA_LOADER, config2)
        self.assertEqual(expected_template, new_template1)
        self.assertEqual(expected_template, new_template2)

    def test_template_generation_data_loader_specific(self):
        redshift_template = """from mage_ai.io.redshift import Redshift
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_redshift() -> DataFrame:
    \"\"\"
    Template code for loading data from Redshift cluster. Additional
    configuration parameters can be added to the `config` dictionary.
    \"\"\"
    query = 'your_redshift_selection_query'
    config = {
        'database': 'your_redshift_database_name',
        'user': 'database_login_username',
        'password': 'database_login_password',
        'host': 'database_host',
        'port': 'database_port',
    }

    with Redshift.with_temporary_credentials(**config) as loader:
        return loader.load(query)
"""
        s3_template = """from mage_ai.io.s3 import S3
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_from_s3_bucket() -> DataFrame:
    \"\"\"
    Template code for loading data from S3 bucket.

    This template assumes that user credentials are specified in `~/.aws`.
    If not, use `S3.with_credentials()` to manually specify AWS credentials or use
    AWS CLI to configure credentials on system.
    \"\"\"
    bucket_name = 'your_s3_bucket_name'  # Specify S3 bucket name to pull data from
    object_key = 'your_object_key'  # Specify object to download from S3 bucket

    return S3(bucket_name, object_key).load()
"""

        config1 = {'data_source': DataSource.REDSHIFT}
        config2 = {'data_source': DataSource.S3}
        new_redshift_template = fetch_template_source(BlockType.DATA_LOADER, config1)
        new_s3_template = fetch_template_source(BlockType.DATA_LOADER, config2)
        self.assertEqual(redshift_template, new_redshift_template)
        self.assertEqual(s3_template, new_s3_template)

    def test_template_generation_transformer_default(self):
        expected_template = """from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def transform_df(df: DataFrame) -> DataFrame:
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


@transformer
def transform_df(df: DataFrame) -> DataFrame:
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


@transformer
def execute_transformer_action(df: DataFrame) -> DataFrame:
    \"\"\"
    Execute Transformer Action: clean_column_name
    \"\"\"
    action = build_transformer_action(
        action_type=ActionType.CLEAN_COLUMN_NAME,
        action_arguments=[],
        axis=Axis.COLUMN,
    )

    return BaseAction(action).execute(df)
"""

        config = {'action_type': ActionType.CLEAN_COLUMN_NAME.value, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_action_code(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame) -> DataFrame:
    \"\"\"
    Execute Transformer Action: custom
    \"\"\"
    action = build_transformer_action(
        action_type=ActionType.CUSTOM,
        action_arguments=[],
        axis=Axis.ROW,
        action_code='your_action_code'
    )

    return BaseAction(action).execute(df)
"""

        config = {'action_type': ActionType.CUSTOM.value, 'axis': Axis.ROW}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_action_options(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame) -> DataFrame:
    \"\"\"
    Execute Transformer Action: reformat
    \"\"\"
    action = build_transformer_action(
        action_type=ActionType.REFORMAT,
        action_arguments=[],
        axis=Axis.COLUMN,
        action_options={'your_action_option': None}
    )

    return BaseAction(action).execute(df)
"""

        config = {'action_type': ActionType.REFORMAT.value, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_transformer_action_outputs(self):
        expected_template = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame) -> DataFrame:
    \"\"\"
    Execute Transformer Action: add
    \"\"\"
    action = build_transformer_action(
        action_type=ActionType.ADD,
        action_arguments=[],
        axis=Axis.COLUMN,
        action_code='your_action_code',
        action_options={'your_action_option': None},
        outputs=['your_output_metadata']
    )

    return BaseAction(action).execute(df)
"""

        config = {'action_type': ActionType.ADD.value, 'axis': Axis.COLUMN}
        new_template = fetch_template_source(BlockType.TRANSFORMER, config)
        self.assertEqual(expected_template, new_template)

    def test_template_generation_data_exporter_default(self):
        expected_template = """from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data(df: DataFrame) -> None:
    \"\"\"
    Exports data to some source

    Args:
        df (DataFrame): Data frame to export to
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
        bigquery_template = """from mage_ai.io.bigquery import BigQuery
from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_big_query(df: DataFrame) -> None:
    \"\"\"
    Template code for exporting data to Google BigQuery.

    Depending on your preferred method of providing service account credentials,
    there are three options for initializing a Google BigQuery data loader:

    1. (Default) If the environment variable `GOOGLE_APPLICATION_CREDENTIALS` contains the path
    to the service account key, construct the data loader using the default constructor. Any
    additional parameters can still be specified as a keyword argument.

    2. If the path to the service account key is manually specified, construct the data loader
    using the factory method `with_credentials_file`. Example:
    ```
    BigQuery.with_credentials_file('path/to/service/account/key.json', **kwargs)
    ```

    3. If the contents of the service account key are manually specified in a dictionary-like
    object, construct the data loader using this factory method `with_credentials_object`. Example:
    ```
    BigQuery.with_credentials_object({'service_key': ...}, **kwargs)
    ```
    \"\"\"
    table_id = 'your-project.your_dataset.your_table_name'
    config = {
        # Specify any other configuration settings here to pass to BigQuery client
        'project': 'your_project_name',
    }
    return BigQuery(**config).export(
        df,
        table_id,
        if_exists='replace',  # Specify resolution policy if table name already exists
    )
"""
        snowflake_template = """from mage_ai.io.snowflake import Snowflake
from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_snowflake(df: DataFrame) -> None:
    \"\"\"
    Template code for exporting data to a table in a Snowflake warehouse
    \"\"\"
    table_name = 'your_table_name'
    database = 'your_database_name'
    schema = 'your_schema_name'
    config = {
        'user': 'your_snowflake_username',
        'password': 'your_snowflake_password',
        'account': 'your_snowflake_account_identifier',
    }

    with Snowflake(**config) as loader:
        return loader.export(
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
