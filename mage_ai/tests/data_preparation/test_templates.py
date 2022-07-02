from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_loader.base import DataSource
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
        redshift_template = """from mage_ai.data_loader.redshift import Redshift
from pandas import DataFrame


@data_loader
def load_data_from_redshift() -> DataFrame:
    \"\"\"
    Template code for loading data from Redshift cluster. Additional
    configuration parameters can be added to the `config` dictionary.
    \"\"\"
    config = {
        'database': 'your_redshift_database_name',
        'user': 'database_login_username',
        'password': 'database_login_password',
        'host': 'database_host',
        'port': 'database_port',
    }
    query = 'your_redshift_selection_query'

    with Redshift.with_temporary_credentials(**config) as loader:
        return loader.load(query)
"""
        s3_template = """from mage_ai.data_loader.s3 import S3
from pandas import DataFrame


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


@transformer
def transform_df(df: DataFrame) -> DataFrame:
    \"\"\"
    Template code for a transformer block.

    Args:
        df (DataFrame): Data frame from previously executed block.

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


@transformer
def transform_df(df: DataFrame) -> DataFrame:
    \"\"\"
    Template code for a transformer block.

    Args:
        df (DataFrame): Data frame from previously executed block.

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
