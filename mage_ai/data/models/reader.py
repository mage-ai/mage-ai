from typing import Any, List, Optional, Union

from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.reader import (
    sample_batch_datasets,
    sample_batch_datasets_async,
    scan_batch_datasets_generator,
    scan_batch_datasets_generator_async,
)


class Reader(BaseData):
    def read_sync(
        self,
        chunks: Optional[List[int]] = None,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        if self.is_dataframe():
            if sample and sample_count:
                return sample_batch_datasets(
                    self.data_partitions_path,
                    chunks=chunks,
                    columns=columns,
                    deserialize=True,
                    sample_count=sample_count,
                )
            return scan_batch_datasets_generator(
                self.data_partitions_path, chunks=chunks, columns=columns, deserialize=deserialize
            )

    async def read_async(
        self,
        chunks: Optional[List[int]] = None,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        if self.is_dataframe():
            if sample and sample_count:
                return await sample_batch_datasets_async(
                    self.data_partitions_path,
                    chunks=chunks,
                    columns=columns,
                    deserialize=True,
                    sample_count=sample_count,
                )
            return await scan_batch_datasets_generator_async(
                self.data_partitions_path,
                chunks=chunks,
                columns=columns,
                deserialize=deserialize,
            )
