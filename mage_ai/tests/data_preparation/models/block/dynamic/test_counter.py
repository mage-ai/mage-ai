import os
from unittest.mock import patch

from mage_ai.data_preparation.models.block.dynamic.constants import (
    CHILD_DATA_VARIABLE_UUID,
)
from mage_ai.data_preparation.models.block.dynamic.counter import DynamicItemCounter
from mage_ai.data_preparation.models.variables.constants import (
    VariableAggregateDataTypeFilename,
)
from mage_ai.tests.data_preparation.models.test_blocks_helper import (
    BlockHelperTest,
    load,
    load_dataframe,
)


def load_dataframes_for_dynamic_children(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return (create_dataframe(n_rows=9999, use_pandas=False),)


class DynamicBlockCounterTest(BlockHelperTest):
    @patch(
        'mage_ai.data.models.manager.DataManager.writeable',
        lambda data_manager, _data: data_manager.is_dataframe(),
    )
    @patch('mage_ai.data.models.manager.DataManager.readable', lambda _data_manager: True)
    def test_dynamic_block_item_count_using_precomputed_stats(self, *args, **kwargs):
        block = self.create_block(func=load_dataframe)
        self.pipeline.add_block(block)

        with patch('mage_ai.settings.server.MEMORY_MANAGER_V2', True):
            with patch('mage_ai.settings.server.MEMORY_MANAGER_POLARS_V2', True):
                block.execute_sync(execution_partition='multiverse')

                self.assertEqual(
                    DynamicItemCounter(block, partition='multiverse').item_count(),
                    1200,
                )

    @patch(
        'mage_ai.data.models.manager.DataManager.writeable',
        lambda data_manager, _data: data_manager.is_dataframe(),
    )
    @patch('mage_ai.data.models.manager.DataManager.readable', lambda _data_manager: True)
    def test_dynamic_block_item_count_using_output_parts(self, *args, **kwargs):
        block = self.create_block(func=load)
        self.pipeline.add_block(block)

        with patch('mage_ai.settings.server.MEMORY_MANAGER_V2', True):
            with patch('mage_ai.settings.server.MEMORY_MANAGER_POLARS_V2', True):
                block.execute_sync(execution_partition='multiverse')

                self.assertEqual(
                    DynamicItemCounter(block, partition='multiverse').item_count(), 10
                )

    @patch(
        'mage_ai.data.models.manager.DataManager.writeable',
        lambda data_manager, _data: data_manager.is_dataframe(),
    )
    @patch('mage_ai.data.models.manager.DataManager.readable', lambda _data_manager: True)
    def test_dynamic_block_item_count_using_parquet_file_metadata(self, *args, **kwargs):
        block = self.create_block(
            func=load_dataframes_for_dynamic_children,
            configuration=dict(
                variables=dict(
                    write=dict(
                        batch_settings=dict(
                            items=dict(maximum=99),
                        )
                    )
                ),
            ),
        )
        self.pipeline.add_block(block)

        with patch('mage_ai.settings.server.MEMORY_MANAGER_V2', True):
            with patch('mage_ai.settings.server.MEMORY_MANAGER_POLARS_V2', True):
                block.execute_sync(execution_partition='multiverse')

                variable = block.variable_manager.get_variable_object(
                    block.pipeline.uuid,
                    block.uuid,
                    CHILD_DATA_VARIABLE_UUID,
                    partition='multiverse',
                )

                path = os.path.join(
                    variable.variable_path,
                    VariableAggregateDataTypeFilename.STATISTICS.value,
                )
                if variable.storage.path_exists(path):
                    variable.storage.remove(path)

                self.assertEqual(
                    DynamicItemCounter(block, partition='multiverse').item_count(), 9999
                )
