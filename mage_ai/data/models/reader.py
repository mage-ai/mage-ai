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
            params = dict(chunks=chunks, columns=columns)

            def __read(
                sample=sample,
                sample_count=sample_count,
                data_partitions_path=self.data_partitions_path,
                deserialize=deserialize,
                params=params,
            ):
                if sample and sample_count:
                    return sample_batch_datasets(
                        data_partitions_path,
                        sample_count=sample_count,
                        **params,
                    )
                return scan_batch_datasets_generator(
                    data_partitions_path, deserialize=deserialize, **params
                )

            if self.monitor_memory:
                with self.build_memory_manager():
                    batches = __read()
            else:
                batches = __read()

            return batches

    async def read_async(
        self,
        chunks: Optional[List[int]] = None,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        if self.is_dataframe():
            params = dict(chunks=chunks, columns=columns)

            async def __read(
                sample=sample,
                sample_count=sample_count,
                data_partitions_path=self.data_partitions_path,
                deserialize=deserialize,
                params=params,
            ):
                if sample and sample_count:
                    return await sample_batch_datasets_async(
                        data_partitions_path,
                        sample_count=sample_count,
                        **params,
                    )
                return await scan_batch_datasets_generator_async(
                    data_partitions_path, deserialize=deserialize, **params
                )

            if self.monitor_memory:
                with self.build_memory_manager():
                    batches = await __read()
            else:
                batches = await __read()

            return batches
