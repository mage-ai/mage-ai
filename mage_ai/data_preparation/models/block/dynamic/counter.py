from typing import Any, Iterable, List, Optional, Sequence

from mage_ai.data.tabular.reader import read_metadata
from mage_ai.data_preparation.models.block.dynamic.constants import (
    CHILD_DATA_VARIABLE_UUID,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.variables.cache import VariableAggregateCache
from mage_ai.data_preparation.models.variables.constants import (
    VariableAggregateDataType,
    VariableAggregateSummaryGroupType,
)
from mage_ai.data_preparation.models.variables.summarizer import (
    dynamic_block_index_paths,
    get_aggregate_summary_info,
    get_part_uuids,
)


class DynamicItemCounter:
    def __init__(
        self,
        block: Any,
        dynamic_block_index: Optional[int] = None,
        partition: Optional[str] = None,
        variable_uuid: Optional[str] = None,
    ):
        self.block = block
        self.dynamic_block_index = dynamic_block_index
        self.variable_uuid = variable_uuid or CHILD_DATA_VARIABLE_UUID
        self.partition = partition

        self.dynamic = is_dynamic_block(self.block)
        self.dynamic_child = is_dynamic_block_child(self.block)
        self.reduce_output = should_reduce_output(self.block)

        self._output = None
        self._summary_information = None

    @property
    def variable_manager(self):
        return self.block.variable_manager

    @property
    def pipeline(self):
        return self.block.pipeline

    @property
    def output(self):
        if self._output is not None:
            return self._output

        self._output = self.variable.read_data()
        return self._output

    @property
    def variable(self):
        return self.variable_manager.get_variable_object(
            self.pipeline.uuid, self.block.uuid, self.variable_uuid, partition=self.partition
        )

    def item_count(self) -> int:
        return 0


class DynamicBlockItemCounter(DynamicItemCounter):
    @property
    def summary_information(self) -> Optional[VariableAggregateCache]:
        if self._summary_information is not None:
            return self._summary_information

        self._summary_information = get_aggregate_summary_info(
            self.block.variable_manager,
            pipeline_uuid=self.block.pipeline.uuid,
            block_uuid=self.block.uuid,
            variable_uuid=CHILD_DATA_VARIABLE_UUID,
            data_type=VariableAggregateDataType.STATISTICS,
            partition=self.partition,
        )
        return self._summary_information

    @property
    def part_uuids(self) -> Optional[Sequence]:
        return get_part_uuids(self.variable)

    @property
    def num_rows_from_parquet_metadata(self) -> Optional[int]:
        metadata = read_metadata(self.variable.variable_path)
        if metadata:
            num_rows = metadata.get('num_rows') or 0
            if num_rows is not None and str(num_rows).isdigit():
                return int(str(num_rows))
        return 0

    def item_count(self) -> int:
        """
        Try the following methods to calculate the item count by starting with the
        lowest resource consumption method first.

        1. Read the original_row_count from:
            block_uuid/
                output_0/
                    statistics.json
        2. Counting the number of parts within an output variable directory:
            block_uuid/
                output_0/
                    0/
                        filename.extension
        3. Parquet metadata: read_metadata('source_directory')['num_rows']
            block_uuid/
                output_0/
                    chunks/
                        chunk=0/
                            filename.parquet
                        filename.parquet
        4. Read the file into memory (worst case)
        """
        if (
            self.summary_information is not None
            and self.summary_information.statistics is not None
            and self.summary_information.statistics.original_row_count is not None
        ):
            return self.summary_information.statistics.original_row_count

        if self.part_uuids is not None:
            return len(self.part_uuids)

        if self.num_rows_from_parquet_metadata is not None:
            return self.num_rows_from_parquet_metadata

        if self.output is not None and isinstance(self.output, Iterable):
            return sum(1 for _ in self.output)

        return 0


class DynamicChildItemCounter(DynamicItemCounter):
    @property
    def summary_information(self) -> Optional[VariableAggregateCache]:
        if self._summary_information is not None:
            return self._summary_information

        self._summary_information = get_aggregate_summary_info(
            self.block.variable_manager,
            pipeline_uuid=self.block.pipeline.uuid,
            block_uuid=self.block.uuid,
            variable_uuid=CHILD_DATA_VARIABLE_UUID,
            data_type=VariableAggregateDataType.STATISTICS,
            group_type=VariableAggregateSummaryGroupType.DYNAMIC,
            partition=self.partition,
        )
        return self._summary_information

    @property
    def part_uuids(self) -> Optional[Sequence]:
        return dynamic_block_index_paths(self.variable)

    def item_count(self) -> int:
        """
        1. Similar to counting the number of parts,
        count the number of dynamic child block directories
            block_uuid/
                0/
                    output_0/
                        filename.extension
        2. If dynamic child block reduces output, the count is 1
        """
        if should_reduce_output(self.block):
            return 1

        if self.part_uuids is not None:
            return len(self.part_uuids)

        if self.output is not None and isinstance(self.output, Iterable):
            return sum(1 for _ in self.output)

        return 0


class DynamicDuoItemCounter(DynamicItemCounter):
    @property
    def indexes(self) -> List[int]:
        dynamic_child_counter = DynamicChildItemCounter(
            self.block,
            partition=self.partition,
            variable_uuid=self.variable_uuid,
        )
        return [i for i in range(dynamic_child_counter.item_count())]

    def item_count(self) -> int:
        """
        If block is dynamic and a dynamic child,
        the count is the sum of dynamic_output_item_count() across all dynamic child blocks:
            0/
                -> [1, 2, 3]
            1/
                -> [4, 5]
            2/
                -> [6, 7, 8]
        Count: 8

        After a block completes, the statistics.json must be created, aggregated, and mapped:

        block_uuid/
            0/
                output_0/
                    0/
                        data.parquet
                        statistics.json
                    1/
                output_1/
            1/
                output_0/
                    data.json
                    statistics.json
        """
        return sum([
            DynamicBlockItemCounter(
                self.block,
                dynamic_block_index=dynamic_block_index,
                partition=self.partition,
                variable_uuid=self.variable_uuid,
            ).item_count()
            for dynamic_block_index in self.indexes
        ])
