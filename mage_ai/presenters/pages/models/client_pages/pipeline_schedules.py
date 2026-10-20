from typing import List

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.resources.PipelineScheduleResource import PipelineScheduleResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.presenters.pages.models.base import ClientPage, PageComponent
from mage_ai.presenters.pages.models.client_pages.pipelines import (
    DetailPage as PipelinesDetailPage,
)
from mage_ai.presenters.pages.models.constants import ResourceType
from mage_ai.presenters.pages.models.page_components.pipeline_schedules import (
    CreateWithInteractionsComponent,
    EditComponent,
)


class BasePage(ClientPage):
    parent_page: PipelinesDetailPage
    resource = ResourceType.PIPELINE_SCHEDULE
    version = 1


class ListPage(BasePage):
    operation = OperationType.LIST


class CreatePage(BasePage):
    operation = OperationType.CREATE

    @classmethod
    async def components(self, **kwargs) -> List[PageComponent]:
        return [
            CreateWithInteractionsComponent,
            EditComponent,
        ]

    @classmethod
    async def disabled(self, current_user: User = None, **kwargs) -> bool:
        pipelines = kwargs.get('pipelines') or []
        for pipeline in [p for p in pipelines if p]:
            pipeline_schedule = PipelineScheduleResource.model_class(pipeline_uuid=pipeline.uuid)
            resource = PipelineScheduleResource(pipeline_schedule, current_user)
            policy = resource.policy_class()(resource, current_user)
            try:
                await policy.authorize_action(OperationType.CREATE)
            except ApiError:
                return True

        return False
