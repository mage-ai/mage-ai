import asyncio
from datetime import datetime
from typing import Dict, List, Tuple

from mage_ai.cache.pipeline import PipelineCache
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.pipelines.utils import add_application_actions
from mage_ai.data_preparation.models.constants import PIPELINE_TYPE_DISPLAY_NAME_MAPPING
from mage_ai.shared.hash import merge_dict


class PipelineFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        async def build_and_score(data_input: Tuple[str, Dict], items=items, factory=self):
            project_uuid, data = data_input
            pipeline = data.get('pipeline')

            pipeline_type = pipeline.get('type')
            repo_path = pipeline.get('repo_path')
            title = pipeline.get('name') or pipeline.get('uuid')
            description = pipeline.get('description')
            if not description:
                type_label = PIPELINE_TYPE_DISPLAY_NAME_MAPPING.get(pipeline_type)
                if type_label:
                    description = f'{type_label} pipeline'
                    if repo_path:
                        description = f'{description} in {repo_path}'

            item_dict = dict(
                item_type=ItemType.DETAIL,
                object_type=ObjectType.PIPELINE,
                title=title,
                description=description,
                uuid=project_uuid,
                metadata=dict(
                    pipeline=dict(
                        blocks=pipeline.get('blocks'),
                        description=pipeline.get('description'),
                        name=pipeline.get('name'),
                        repo_path=repo_path,
                        tags=pipeline.get('tags'),
                        type=pipeline_type,
                        updated_at=pipeline.get('updated_at'),
                        uuid=pipeline.get('uuid'),
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
            cache = await PipelineCache.initialize_cache()
            mapping = cache.get(cache.cache_key).get('models') or {}
            print(f'[PipelineFactory] Load: {len(mapping)} - {datetime.utcnow().timestamp() - now}')

            data_array = mapping.items()
            now = datetime.utcnow().timestamp()
            await asyncio.gather(
                *[build_and_score(data) for data in data_array]
            )
            print(
                f'[PipelineFactory] Search {self.search}: '
                f'{len(items)} - {datetime.utcnow().timestamp() - now}',
            )

            now = datetime.utcnow().timestamp()
            items = await self.rank_items(items)
            items = [merge_dict(
                item_dict,
                add_application_actions(item_dict),
            ) for item_dict in items]
            print(f'[PipelineFactory] Rank items: {datetime.utcnow().timestamp() - now}')

        return items
