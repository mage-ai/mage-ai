import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

from mage_ai.cache.block import BlockCache
from mage_ai.command_center.blocks.utils import add_application_actions
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.utils import shorten_directory
from mage_ai.shared.hash import merge_dict


class BlockFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        async def build_and_score(data_input: Tuple[str, Dict], items=items, factory=self):
            uuid, data = data_input
            block = data.get('block')
            pipelines = [d.get('pipeline') for d in (data.get('pipelines') or [])]

            file_path = block.get('file_path') or f'{uuid}'
            if not Path(file_path).suffix:
                file_path = f'{file_path}.py'

            path_dict = shorten_directory(file_path)
            directory = path_dict.get('directory')

            if block.get('name'):
                parts = Path(block.get('name')).parts
            else:
                parts = Path(uuid).parts
            title = parts[len(parts) - 1]

            description = directory
            if len(pipelines) == 1:
                description = f'{description} in 1 pipeline'
            else:
                description = f'{description} in {len(pipelines)} pipelines'

            item_dict = dict(
                item_type=ItemType.DETAIL,
                object_type=ObjectType.BLOCK,
                title=title,
                description=description,
                uuid=uuid,
                metadata=dict(
                    block=dict(
                        file_path=file_path,
                        language=block.get('language'),
                        pipelines=pipelines,
                        type=block.get('type'),
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
                items.append(scored)

        if self.search:
            now = datetime.utcnow().timestamp()
            cache = await BlockCache.initialize_cache()
            mapping = cache.get(cache.cache_key)
            print(f'[BlockFactory] Load: {len(mapping)} - {datetime.utcnow().timestamp() - now}')

            data_array = mapping.items()
            now = datetime.utcnow().timestamp()
            await asyncio.gather(
                *[build_and_score(data) for data in data_array]
            )
            print(
                f'[BlockFactory] Search {self.search}: '
                f'{len(items)} - {datetime.utcnow().timestamp() - now}',
            )

            now = datetime.utcnow().timestamp()
            items = await self.rank_items(items)
            items = [merge_dict(
                item_dict,
                add_application_actions(item_dict),
            ) for item_dict in items]
            print(f'[BlockFactory] Rank items: {datetime.utcnow().timestamp() - now}')

        return items
