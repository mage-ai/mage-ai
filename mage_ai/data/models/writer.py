from typing import Any

from mage_ai.data.models.base import BaseData
from mage_ai.data.tabular.writer import to_parquet_async, to_parquet_sync
from mage_ai.shared.files import (
    makedirs_async,
    makedirs_sync,
    safe_delete_dir_async,
    safe_delete_dir_sync,
)


class Writer(BaseData):
    """
    - all_upstream_blocks_executed: false
      color: null
      configuration:
        file_source:
          path: memory_upgrade_v2/data_exporters/bold_portal.py
        variables:
          write:
            batch_settings:
              items:
                maximum: 170000
            chunks:
            - key
    """

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
