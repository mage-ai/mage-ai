from typing import List

from mage_ai.api.operations.constants import OperationType
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
