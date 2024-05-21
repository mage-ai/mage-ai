from typing import Any

from mage_ai.data.models.shared import BaseData
from mage_ai.data.tabular.writer import to_parquet_async, to_parquet_sync
from mage_ai.shared.files import (
    makedirs_async,
    makedirs_sync,
    safe_delete_dir_async,
    safe_delete_dir_sync,
)


class Writer(BaseData):
    def write_sync(self, data: Any, replace: bool = True) -> None:
        makedirs_sync(self.data_partitions_path)
        if replace:
            safe_delete_dir_sync(self.data_partitions_path)

        if self.is_dataframe():
            to_parquet_sync(
                self.data_partitions_path,
                df=data,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )

    async def write_async(self, data: Any, replace: bool = True) -> None:
        await makedirs_async(self.data_partitions_path)
        if replace:
            await safe_delete_dir_async(self.data_partitions_path)

        if self.is_dataframe():
            await to_parquet_async(
                self.data_partitions_path,
                df=data,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )
