import uuid
from typing import Any, Dict, Optional

from mage_ai.data.models.base import BaseData
from mage_ai.data.tabular.writer import to_parquet_async, to_parquet_sync
from mage_ai.io.base import ExportWritePolicy
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

    def write_sync(self, data: Any, replace: Optional[bool] = None) -> Optional[Dict[str, int]]:
        makedirs_sync(self.data_source_directory_path)

        mode = self.__write_mode
        replace = replace if replace is not None else ExportWritePolicy.REPLACE == mode
        if replace:
            safe_delete_dir_sync(self.data_source_directory_path)

        if self.is_dataframe():
            return to_parquet_sync(
                self.data_source_directory_path,
                df=data,
                basename_template=self.__basename_template,
                existing_data_behavior=self.__existing_data_behavior,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )

    async def write_async(self, data: Any, replace: bool = True) -> Optional[Dict[str, int]]:
        await makedirs_async(self.data_source_directory_path)

        mode = self.__write_mode
        replace = replace if replace is not None else ExportWritePolicy.REPLACE == mode
        if replace:
            await safe_delete_dir_async(self.data_source_directory_path)

        if self.is_dataframe():
            return await to_parquet_async(
                self.data_source_directory_path,
                df=data,
                basename_template=self.__basename_template,
                existing_data_behavior=self.__existing_data_behavior,
                settings=self.batch_settings,
                partition_cols=[str(key) for key in (self.chunks or [])],
            )

    @property
    def __basename_template(self) -> str:
        mode = self.__write_mode
        filename = uuid.uuid5(uuid.NAMESPACE_OID, self.uuid)
        if ExportWritePolicy.APPEND == mode:
            filename = str(uuid.uuid4())
        return '{i}-' + f'{filename}.parquet'

    @property
    def __existing_data_behavior(self) -> str:
        mode = self.__write_mode
        return (
            'error'
            if ExportWritePolicy.FAIL == mode
            else 'overwrite_or_ignore'
            if ExportWritePolicy.APPEND == mode
            else 'delete_matching'
        )

    @property
    def __write_mode(self) -> ExportWritePolicy:
        if self.batch_settings and self.batch_settings.mode is not None:
            return ExportWritePolicy.from_value(self.batch_settings.mode)

        return ExportWritePolicy.REPLACE
