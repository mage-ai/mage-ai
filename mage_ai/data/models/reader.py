from typing import Any, List, Optional, Union

from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.reader import sample_batch_datasets, scan_batch_datasets


class Reader(BaseData):
    def read_sync(
        self,
        chunks: Optional[List[int]] = None,
        columns: Optional[List[str]] = None,
        deserialize: Optional[bool] = False,
        return_generator: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        if self.is_dataframe():

            def __read(
                chunks=chunks,
                columns=columns,
                deserialize=deserialize,
                return_generator=return_generator,
                sample=sample,
                sample_count=sample_count,
                data_partitions_path=self.data_partitions_path,
            ):
                if sample and sample_count:
                    return sample_batch_datasets(
                        data_partitions_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
                        sample_count=sample_count,
                    )
                else:
                    return scan_batch_datasets(
                        data_partitions_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
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
        return_generator: Optional[bool] = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        data = self.read_sync(
            chunks=chunks,
            columns=columns,
            deserialize=deserialize,
            return_generator=return_generator,
            sample=sample,
            sample_count=sample_count,
        )
        return data
