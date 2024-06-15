from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.shared.files import delete_async, exists_async, read_async
from mage_ai.shared.models import BaseDataClass
from mage_ai.shared.path_fixer import remove_base_repo_directory_name


@dataclass
class Item(BaseDataClass):
    path: str
    content: Optional[str] = None
    extension: Optional[str] = None
    language: Optional[BlockLanguage] = None
    modified_timestamp: Optional[int] = None
    name: Optional[str] = None
    relative_path: Optional[str] = None
    size: Optional[int] = None

    def __post_init__(self):
        if self.path is not None:
            self.name = os.path.basename(self.path)
            self.relative_path = remove_base_repo_directory_name(self.path)

            if os.path.exists(self.path):
                self.modified_timestamp = round(os.path.getmtime(self.path))
                self.size = os.path.getsize(self.path)

            self.extension = Path(self.path).suffix.lstrip('.')
            if self.language is None:
                self.language = (
                    FILE_EXTENSION_TO_BLOCK_LANGUAGE.get(self.extension, None)
                    if self.extension
                    else None
                )
            else:
                self.serialize_attribute_enum('language', BlockLanguage)

    async def get_content(self) -> Optional[str]:
        if self.content is None:
            self.content = await read_async(self.path)
        return self.content

    async def exists(self) -> bool:
        return await exists_async(self.path)

    async def create(self, overwrite: Optional[bool] = None) -> bool:
        return (
            True
            if await File.create_async(
                os.path.basename(self.path),
                os.path.dirname(self.path),
                content=self.content,
                overwrite=overwrite,
            )
            else False
        )

    async def update(self) -> bool:
        return await self.create(overwrite=True)

    async def rename(self, new_path: str, overwrite: Optional[bool] = None) -> bool:
        return await File.rename_async(self.path, new_path, overwrite=overwrite)

    async def move(self, new_path: str, overwrite: Optional[bool] = None) -> bool:
        return await self.rename(new_path, overwrite=overwrite)

    async def delete(self, ignore_exists: Optional[bool] = None) -> bool:
        return await delete_async(self.path, ignore_exists=ignore_exists)

    async def synchronize(self, item: Item) -> bool:
        new_content = item.content
        if self.content != new_content:
            self.content = new_content
            if not await self.update():
                raise Exception(f'Failed to update content for file at {self.path}')

        if os.path.dirname(self.path) != os.path.dirname(item.path):
            new_path = item.path
            if await self.move(new_path):
                self.path = new_path
            else:
                raise Exception(f'Failed to move file from {self.path} to {new_path}')
        elif item.name is not None and self.name != item.name:
            new_name = item.name
            if await self.rename(new_name):
                self.name = new_name
            else:
                raise Exception(f'Failed to rename file from {self.name} to {new_name}')

        return True
