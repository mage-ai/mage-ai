from typing import Any, Dict, Optional

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

    def write_sync(self, data: Any, replace: bool = True) -> Optional[Dict[str, int]]:
        makedirs_sync(self.data_source_directory_path)
        if replace:
            safe_delete_dir_sync(self.data_source_directory_path)

        if self.is_dataframe():
            return to_parquet_sync(
                self.data_source_directory_path,
                df=data,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )

    async def write_async(self, data: Any, replace: bool = True) -> Optional[Dict[str, int]]:
        await makedirs_async(self.data_source_directory_path)
        if replace:
            await safe_delete_dir_async(self.data_source_directory_path)

        if self.is_dataframe():
            return await to_parquet_async(
                self.data_source_directory_path,
                df=data,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )
