from typing import Any, List, Optional, Union

from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.reader import (
    sample_batch_datasets,
    sample_batch_datasets_async,
    scan_batch_datasets,
    scan_batch_datasets_async,
)


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
                variable_path=self.variable_path,
            ):
                if sample and sample_count:
                    return sample_batch_datasets(
                        sample_count,
                        variable_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
                        return_generator=return_generator,
                    )
                else:
                    return scan_batch_datasets(
                        variable_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
                        return_generator=return_generator,
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
        if self.is_dataframe():

            async def __read(
                chunks=chunks,
                columns=columns,
                deserialize=deserialize,
                return_generator=return_generator,
                sample=sample,
                sample_count=sample_count,
                variable_path=self.variable_path,
            ):
                if sample and sample_count:
                    return await sample_batch_datasets_async(
                        sample_count,
                        variable_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
                        return_generator=return_generator,
                    )
                else:
                    return await scan_batch_datasets_async(
                        variable_path,
                        chunks=chunks,
                        columns=columns,
                        deserialize=deserialize,
                        return_generator=return_generator,
                    )

            if self.monitor_memory:
                with self.build_memory_manager():
                    batches = await __read()
            else:
                batches = await __read()

            return batches
