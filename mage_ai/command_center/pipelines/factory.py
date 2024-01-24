import asyncio
import os
from datetime import datetime
from typing import Dict, List

from sqlalchemy import or_

from mage_ai.cache.pipeline import PipelineCache
from mage_ai.command_center.blocks.utils import build_and_score as build_and_score_block
from mage_ai.command_center.constants import ApplicationType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.pipelines.constants import ITEMS
from mage_ai.command_center.pipelines.utils import (
    add_application_actions,
    build_and_score,
)
from mage_ai.command_center.triggers.utils import (
    build_and_score as build_and_score_trigger,
)
from mage_ai.command_center.triggers.utils import (
    build_create_and_score as build_create_and_score_trigger,
)
from mage_ai.command_center.triggers.utils import build_run_once_and_score
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.settings.utils import base_repo_dirname, base_repo_path
from mage_ai.shared.hash import merge_dict


class PipelineFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        if self.item and \
                ObjectType.PIPELINE == self.item.object_type and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type and \
                self.item.metadata and \
                self.item.metadata.pipeline:

            from mage_ai.cache.block import BlockCache

            # Pipeline
            metadata = self.item.metadata.pipeline
            pipeline = await Pipeline.get_async(
                metadata.uuid,
                all_projects=True,
                repo_path=os.path.join(
                    base_repo_dirname(),
                    metadata.repo_path,
                ) if metadata.repo_path else base_repo_path(),
            )

            item_dict = self.item.to_dict()
            scored = self.filter_score(item_dict)
            if scored:
                scored['score'] = 999
                items.append(scored)

            # Triggers
            items.append(await build_create_and_score_trigger(self, pipeline))
            items.append(await build_run_once_and_score(self, pipeline))

            schedules = PipelineSchedule.query.filter(
                PipelineSchedule.pipeline_uuid == pipeline.uuid,
                or_(
                    PipelineSchedule.repo_path == pipeline.repo_path,
                    PipelineSchedule.repo_path.in_(self.project.repo_path_for_database_query(
                        'pipeline_schedules',
                    )),
                    PipelineSchedule.repo_path.is_(None),
                ),
            ).all()

            await asyncio.gather(
                *[build_and_score_trigger(
                    self,
                    data,
                    items,
                    add_application=True,
                ) for data in schedules]
            )

            # Blocks
            cache = await BlockCache.initialize_cache()
            mapping = cache.get(cache.cache_key)

            data_array = []
            for block in pipeline.blocks_by_uuid.values():
                key = cache.build_key(block)
                value = mapping.get(key) or {}
                data_array.append((key, value or {}))

            await asyncio.gather(
                *[build_and_score_block(
                    self,
                    data,
                    items,
                    add_application=True,
                ) for data in data_array]
            )
        else:
            for item_dict in ITEMS:
                item_scored = self.filter_score(item_dict)
                if item_scored:
                    items.append(item_dict)

            if self.search:
                now = datetime.utcnow().timestamp()
                cache = await PipelineCache.initialize_cache()
                mapping = cache.get(cache.cache_key) or {}
                print(
                    f'[PipelineFactory] Load: {len(mapping)} -'
                    f'{datetime.utcnow().timestamp() - now}',
                )

                now = datetime.utcnow().timestamp()
                await asyncio.gather(
                    *[build_and_score(self, data, items) for data in mapping.items()]
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
