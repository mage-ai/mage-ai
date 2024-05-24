from typing import List, Optional, Union

from mage_ai.data.constants import (
    OutputData,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
)
from mage_ai.data.models.base import BaseData
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.reader import (
    sample_batch_datasets,
    scan_batch_datasets_generator,
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
    ) -> Optional[
        Union[
            OutputData,
            ScanBatchDatasetResult,
            RecordBatchGenerator,
        ]
    ]:
        if not self.is_dataframe():
            return

        def __process_source(source):
            if sample and sample_count:
                return sample_batch_datasets(
                    source,
                    chunks=self.chunks,
                    columns=columns,
                    deserialize=deserialize,
                    sample_count=sample_count,
                    settings=self.batch_settings,
                )
            return scan_batch_datasets_generator(
                source,
                chunks=self.chunks,
                columns=columns,
                deserialize=deserialize,
                settings=self.batch_settings,
            )

        if self.number_of_outputs >= 2:
            return DataGenerator([__process_source(source) for source in self.data_source])
        return __process_source(self.data_source)
