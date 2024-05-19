from typing import Any, Optional

from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.writer import to_parquet_async, to_parquet_sync
from mage_ai.shared.files import (
    makedirs_async,
    makedirs_sync,
    safe_delete_dir_async,
    safe_delete_dir_sync,
)


class Writer(BaseData):
    def write_sync(self, data: Any, chunk_size: Optional[int] = None, replace: bool = True) -> None:
        makedirs_sync(self.variable_path)
        if replace:
            safe_delete_dir_sync(self.variable_path)

        if self.is_dataframe():

            def __write(variable_path=self.variable_path, data=data, chunk_size=chunk_size):
                to_parquet_sync(variable_path, df=data, chunk_size=chunk_size)

            if self.monitor_memory:
                with self.build_memory_manager():
                    __write()
            else:
                __write()

    async def write_async(
        self, data: Any, chunk_size: Optional[int] = None, replace: bool = True
    ) -> None:
        await makedirs_async(self.variable_path)
        if replace:
            await safe_delete_dir_async(self.variable_path)

        if self.is_dataframe():
            if self.monitor_memory:
                with self.build_memory_manager():
                    await to_parquet_async(self.variable_path, df=data, chunk_size=chunk_size)
            else:
                await to_parquet_async(self.variable_path, df=data, chunk_size=chunk_size)
