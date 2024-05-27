import inspect
from typing import Callable, Optional
from unittest.mock import patch

from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.mocks import create_dataframe
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.variables.constants import (
    VariableAggregateDataType,
    VariableAggregateSummaryGroupType,
)
from mage_ai.data_preparation.models.variables.summarizer import (
    aggregate_summary_info_for_all_variables,
    dynamic_block_index_paths,
    get_aggregate_summary_info,
    get_part_uuids,
)
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline


def load(*args, **kwargs):
    buckets = 10

    for i in DataGenerator(range(buckets)):
        n_rows = (i + 1) * 100
        yield create_dataframe(
            n_rows=n_rows,
            use_pandas=False,
        )


def transform_data(generator, *args, **kwargs):
    for batch in generator:
        yield batch


def load_generators(*args, **kwargs):
    def load_data(index):
        return create_dataframe(n_rows=(1 + index) * 100, use_pandas=False)

    def measure_data(**kwargs) -> int:
        return 12

    data_generator = DataGenerator(
        load_data=load_data,
        measure_data=lambda _: measure_data(**kwargs),
    )

    for data in data_generator:
        yield data


def load_dataframes_for_dynamic_children(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return [
        [
            create_dataframe(n_rows=100, use_pandas=True),
            create_dataframe(n_rows=100, use_pandas=True),
            create_dataframe(n_rows=100, use_pandas=True),
        ],
    ]


def load_dataframe(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return create_dataframe(n_rows=1200, use_pandas=False)


def process_generator(generator, **kwargs):
    for batch in generator:
        gen = batch.generator(batch_size=75)
        for sub in gen:
            df = sub.deserialize()
            yield df


def passthrough(data, **kwargs):
    return data


class VariableSummarizerTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline(self.faker.unique.name(), self.repo_path)

    def create_block(
        self,
        name: Optional[str] = None,
        content: Optional[str] = None,
        func: Optional[Callable] = None,
        **kwargs,
    ):
        block = Block.create(
            name or self.faker.unique.name(),
            BlockType.TRANSFORMER,
            self.pipeline.repo_path,
            language=BlockLanguage.PYTHON,
            **kwargs,
        )

        if func:
            content = inspect.getsource(func)

        if content:
            block.update_content(
                '\n'.join([
                    'from mage_ai.data.models.generator import DataGenerator',
                    'from mage_ai.data.tabular.mocks import create_dataframe',
                    f'@{block.type}\n{content}',
                ])
            )

        return block

    def test_summarize_with_generators(self, *args, **kwargs):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
            VARIABLE_DATA_OUTPUT_META_CACHE=True,
        ):
            block = self.create_block(func=load)
            transformer = self.create_block(func=transform_data)
            self.pipeline.add_block(block)
            self.pipeline.add_block(transformer, upstream_block_uuids=[block.uuid])

            block.execute_sync()
            transformer.execute_sync()

            variable_manager = self.pipeline.variable_manager
            variable = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
                variable_uuid='output_0',
            )
            variable_transformer = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
            )
            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable)), 10)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=block.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                5500,
            )

            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable_transformer)), 10)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=transformer.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                5500,
            )

    def test_summarize_with_input_data_type_generator_on_upstream_data(self, *args, **kwargs):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
            VARIABLE_DATA_OUTPUT_META_CACHE=True,
        ):
            block = self.create_block(func=load_dataframe)
            transformer = self.create_block(
                func=process_generator,
                configuration=dict(
                    variables=dict(
                        upstream={
                            block.uuid: dict(
                                input_data_types=['generator'],
                            ),
                        },
                    )
                ),
            )
            self.pipeline.add_block(block)
            self.pipeline.add_block(transformer, upstream_block_uuids=[block.uuid])

            block.execute_sync()
            transformer.execute_sync()

            variable_manager = self.pipeline.variable_manager
            variable = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
                variable_uuid='output_0',
            )
            variable_transformer = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
            )
            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
            )

            self.assertIsNone(get_part_uuids(variable))
            self.assertIsNone(
                get_aggregate_summary_info(
                    variable_manager,
                    pipeline_uuid=self.pipeline.uuid,
                    block_uuid=block.uuid,
                    variable_uuid='output_0',
                    data_type=VariableAggregateDataType.STATISTICS,
                    group_type=VariableAggregateSummaryGroupType.PARTS,
                ).parts
            )

            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable_transformer)), 16)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=transformer.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                1200,
            )

    def test_summarize_with_input_data_type_default_on_upstream_generator(self, *args, **kwargs):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
            VARIABLE_DATA_OUTPUT_META_CACHE=True,
        ):
            block = self.create_block(func=load_generators)
            transformer = self.create_block(
                func=transform_data,
            )
            self.pipeline.add_block(block)
            self.pipeline.add_block(transformer, upstream_block_uuids=[block.uuid])

            block.execute_sync()
            transformer.execute_sync()

            variable_manager = self.pipeline.variable_manager
            variable = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
                variable_uuid='output_0',
            )
            variable_transformer = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
            )
            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable)), 12)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=block.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                7800,
            )

            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable_transformer)), 12)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=transformer.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                7800,
            )

    def test_summarize_with_input_data_type_default_no_downstream_block_generator(
        self, *args, **kwargs
    ):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
            VARIABLE_DATA_OUTPUT_META_CACHE=True,
        ):
            block = self.create_block(func=load_generators)
            transformer = self.create_block(
                func=passthrough,
            )
            self.pipeline.add_block(block)
            self.pipeline.add_block(transformer, upstream_block_uuids=[block.uuid])

            block.execute_sync()
            transformer.execute_sync()

            variable_manager = self.pipeline.variable_manager
            variable = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
                variable_uuid='output_0',
            )
            variable_transformer = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
            )
            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
            )

            self.assertEqual(len(get_part_uuids(variable)), 12)
            self.assertEqual(
                sum([
                    info.original_row_count
                    for info in get_aggregate_summary_info(
                        variable_manager,
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=block.uuid,
                        variable_uuid='output_0',
                        data_type=VariableAggregateDataType.STATISTICS,
                        group_type=VariableAggregateSummaryGroupType.PARTS,
                    ).parts.statistics
                ]),
                7800,
            )

            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
            )

            self.assertIsNone(get_part_uuids(variable_transformer))
            self.assertIsNone(
                get_aggregate_summary_info(
                    variable_manager,
                    pipeline_uuid=self.pipeline.uuid,
                    block_uuid=transformer.uuid,
                    variable_uuid='output_0',
                    data_type=VariableAggregateDataType.STATISTICS,
                    group_type=VariableAggregateSummaryGroupType.PARTS,
                ).parts
            )

    def test_dynamic_blocks_yield(self, *args, **kwargs):
        with patch.multiple(
            'mage_ai.settings.server',
            MEMORY_MANAGER_PANDAS_V2=True,
            MEMORY_MANAGER_POLARS_V2=True,
            MEMORY_MANAGER_V2=True,
            VARIABLE_DATA_OUTPUT_META_CACHE=True,
        ):
            block = self.create_block(
                func=load_dataframes_for_dynamic_children, configuration=dict(dynamic=True)
            )
            transformer = self.create_block(
                func=passthrough,
            )
            self.pipeline.add_block(block)
            self.pipeline.add_block(transformer, upstream_block_uuids=[block.uuid])

            block.execute_sync()
            transformer.execute_sync(dynamic_block_index=0)
            transformer.execute_sync(dynamic_block_index=1)
            transformer.execute_sync(dynamic_block_index=2)

            variable_manager = self.pipeline.variable_manager
            variable = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
                variable_uuid='output_0',
            )
            variable_transformer = variable_manager.get_variable_object(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
            )
            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=block.uuid,
            )

            self.assertEqual(len(dynamic_block_index_paths(variable)), 0)
            self.assertIsNone(
                get_aggregate_summary_info(
                    variable_manager,
                    pipeline_uuid=self.pipeline.uuid,
                    block_uuid=block.uuid,
                    variable_uuid='output_0',
                    data_type=VariableAggregateDataType.STATISTICS,
                    group_type=VariableAggregateSummaryGroupType.PARTS,
                ).parts
            )

            aggregate_summary_info_for_all_variables(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
            )

            self.assertEqual(len(dynamic_block_index_paths(variable_transformer)), 3)

            total = 0
            for info in get_aggregate_summary_info(
                variable_manager,
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=transformer.uuid,
                variable_uuid='output_0',
                data_type=VariableAggregateDataType.STATISTICS,
                group_type=VariableAggregateSummaryGroupType.DYNAMIC,
            ).dynamic.statistics:
                total += sum(i.original_row_count for i in info)
            self.assertEqual(total, 300)
