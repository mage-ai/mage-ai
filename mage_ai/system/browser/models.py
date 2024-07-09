from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.repo import get_variables_dir
from mage_ai.shared.array import flatten
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
    output: Optional[List[Dict]] = None
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

    def output_dir(self, namespace: str) -> str:
        return os.path.join(
            get_variables_dir(),
            namespace,
            self.relative_path if self.relative_path else '',
        )

    async def deserialize_output(self, file_path: str) -> List[Dict]:
        if not await exists_async(file_path):
            return []
        text = await read_async(file_path)
        return [json.loads(line) for line in text.split('\n') if line.strip()]

    async def get_output(self, namespace: str, limit: Optional[int] = 10) -> Optional[List[Dict]]:
        if self.output is None and await exists_async(self.output_dir(namespace)):
            file_paths = sorted(
                os.listdir(self.output_dir(namespace)), key=lambda x: x.lower())[:limit]
            output = await asyncio.gather(*[self.deserialize_output(os.path.join(
                self.output_dir(namespace), file_path
            )) for file_path in file_paths])
            self.output = flatten(output)
        return self.output

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
