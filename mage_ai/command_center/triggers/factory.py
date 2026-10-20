import asyncio
from typing import Dict, List

from mage_ai.command_center.constants import ApplicationType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.pipeline_runs.utils import build_and_score
from mage_ai.command_center.triggers.utils import build_create_pipeline_run_once
from mage_ai.orchestration.db.models.schedules import PipelineRun


class TriggerFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        if self.item and \
                ObjectType.TRIGGER == self.item.object_type and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type:

            # Model
            model = self.item.metadata.trigger

            item_dict = self.item.to_dict()
            scored = self.filter_score(item_dict)
            if scored:
                scored['score'] = 999
                items.append(scored)

            # Create
            items.append(await build_create_pipeline_run_once(self, model))

            # Child models
            child_models = PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == model.id,
            ).all()

            await asyncio.gather(
                *[build_and_score(
                    self,
                    data,
                    model,
                    items,
                    add_application=True,
                ) for data in child_models]
            )

            items = await self.rank_items(items)

        return items
