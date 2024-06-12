from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
)
from mage_ai.shared.files import (
    delete_async,
    exists_async,
    move_async,
    read_async,
    rename_async,
    write_async,
)
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
            self.modified_timestamp = round(os.path.getmtime(self.path))
            self.name = os.path.basename(self.path)
            self.relative_path = remove_base_repo_directory_name(self.path)
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
        return await write_async(self.path, self.content, overwrite=overwrite)

    async def update(self) -> bool:
        return await self.create(overwrite=True)

    async def rename(self, new_path: str, overwrite: Optional[bool] = None) -> bool:
        return await rename_async(self.path, new_path, overwrite=overwrite)

    async def move(self, new_path: str, overwrite: Optional[bool] = None) -> bool:
        return await move_async(self.path, new_path, overwrite=overwrite)

    async def delete(self, ignore_exists: Optional[bool] = None) -> bool:
        return await delete_async(self.path, ignore_exists=ignore_exists)

    async def synchronize(self, item: Item) -> bool:
        if os.path.dirname(self.path) != os.path.dirname(item.path):
            await self.move(item.path)
            self.path = item.path
        elif self.name != item.name and item.name is not None:
            await self.rename(item.name)
            self.name = item.name

        if self.content != item.content:
            self.content = item.content
            await self.update()

        return True
