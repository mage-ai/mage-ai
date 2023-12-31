import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from mage_ai.cache.file import FileCache
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS


class FileFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        for item_dict in ITEMS:
            item_scored = self.filter_score(item_dict)
            if item_scored:
                items.append(item_scored)

        files = []

        async def build_and_score(line: str, files=files, factory=self):
            full_path, file_size, modified_timestamp = line.split(',')
            filename = os.path.basename(full_path)

            parts = Path(os.path.dirname(full_path)).parts
            parts_count = len(parts)
            modified_at = datetime.fromtimestamp(float(modified_timestamp)).isoformat()
            dir_name = os.path.join(*parts[max([0, parts_count - 3]):])

            if parts_count >= 4:
                if parts_count >= 5:
                    dir_name = os.path.join('.', dir_name)
                else:
                    dir_name = os.path.join('..', dir_name)

                for _i in range(min(1, parts_count - 4)):
                    dir_name = os.path.join('..', dir_name)

            item_dict = dict(
                item_type=ItemType.DETAIL,
                object_type=ObjectType.FILE,
                title=filename,
                description=dir_name,
                uuid=full_path,
                metadata=dict(
                    file=dict(
                        extension=Path(full_path or '').suffix,
                        full_path=full_path,
                        modified_at=modified_at,
                        modified_timestamp=modified_timestamp,
                        size=file_size,
                    ),
                ),
                display_settings_by_attribute=dict(
                    description=dict(
                        text_styles=dict(
                            monospace=True,
                            small=True,
                        ),
                    ),
                ),
            )
            scored = factory.filter_score(item_dict)
            if scored:
                files.append(scored)

        if self.search:
            now = datetime.utcnow().timestamp()
            cache = FileCache.initialize_cache_with_settings()
            lines = await cache.load() or []
            print(f'[FileFactory] Load files: {len(lines)} - {datetime.utcnow().timestamp() - now}')

            now = datetime.utcnow().timestamp()
            await asyncio.gather(
                *[build_and_score(item_dict) for item_dict in lines]
            )
            print(
                f'[FileFactory] Search {self.search}: '
                f'{len(files)} - {datetime.utcnow().timestamp() - now}',
            )

            now = datetime.utcnow().timestamp()
            files = await self.rank_items(files)
            print(f'[FileFactory] Rank items: {datetime.utcnow().timestamp() - now}')

        return files[:10] + items
