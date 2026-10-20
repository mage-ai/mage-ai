from typing import List, Optional, Union

from mage_ai.data.constants import (
    OutputData,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
)
from mage_ai.data.models.base import BaseData
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.reader import (
    read_metadata,
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
        limit: Optional[int] = None,
        limit_parts: Optional[int] = None,
        offset: Optional[int] = None,
        part: Optional[int] = None,
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

        def __process_source(
            source,
            chunks=self.chunks,
            columns=columns,
            deserialize=deserialize,
            limit=limit,
            offset=offset,
            part=part,
            sample_count=sample_count,
            settings=self.batch_settings,
        ):
            if part is not None and settings is not None and limit is None and offset is None:
                metadata = read_metadata(source)
                if metadata:
                    num_rows = metadata.get('num_rows')
                    if num_rows:
                        batch_size = settings.items.maximum or settings.items.minimum
                        if batch_size:
                            offset = part * batch_size
                            limit = batch_size

            if sample and sample_count:
                return sample_batch_datasets(
                    source,
                    chunks=chunks,
                    columns=columns,
                    deserialize=deserialize,
                    limit=limit,
                    offset=offset,
                    sample_count=sample_count,
                    settings=settings,
                )
            return scan_batch_datasets_generator(
                source,
                chunks=chunks,
                columns=columns,
                deserialize=deserialize,
                limit=limit,
                offset=offset,
                settings=settings,
            )

        if self.number_of_outputs >= 2:
            sources = self.data_source
            if limit_parts is not None:
                sources = sources[:limit_parts]
            return DataGenerator([__process_source(source) for source in sources])
        return __process_source(self.data_source)
