from typing import List, Optional, Union

from mage_ai.data.constants import (
    AsyncRecordBatchGenerator,
    OutputData,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
)
from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.reader import (
    sample_batch_datasets,
    sample_batch_datasets_async,
    scan_batch_datasets_generator,
    scan_batch_datasets_generator_async,
)


class Reader(BaseData):
    """
    - all_upstream_blocks_executed: false
      color: null
      configuration:
        file_source:
          path: memory_upgrade_v2/transformers/reader.py
        variables:
          upstream:
            someblock:
              batch_settings:
                count:
                  maximum: 1
                items:
                  minimum: 100000
              input_data_types:
              - generator
    """

    def read_sync(
        self,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[OutputData, ScanBatchDatasetResult, RecordBatchGenerator]]:
        if self.is_dataframe():
            if sample and sample_count:
                return sample_batch_datasets(
                    self.data_partitions_path,
                    chunks=self.chunks,
                    columns=columns,
                    deserialize=True,
                    sample_count=sample_count,
                    settings=self.batch_settings,
                )
            return scan_batch_datasets_generator(
                self.data_partitions_path,
                chunks=self.chunks,
                columns=columns,
                deserialize=deserialize,
                settings=self.batch_settings,
            )

    async def read_async(
        self,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[OutputData, ScanBatchDatasetResult, AsyncRecordBatchGenerator]]:
        if self.is_dataframe():
            if sample and sample_count:
                return await sample_batch_datasets_async(
                    self.data_partitions_path,
                    chunks=self.chunks,
                    columns=columns,
                    deserialize=True,
                    sample_count=sample_count,
                    settings=self.batch_settings,
                )
            return await scan_batch_datasets_generator_async(
                self.data_partitions_path,
                chunks=self.chunks,
                columns=columns,
                deserialize=deserialize,
                settings=self.batch_settings,
            )
