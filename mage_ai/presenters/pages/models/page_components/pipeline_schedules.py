from mage_ai.api.operations.constants import OperationType
from mage_ai.presenters.pages.models.base import PageComponent
from mage_ai.presenters.pages.models.constants import ComponentCategory, ResourceType


class BaseComponent(PageComponent):
    resource = ResourceType.PIPELINE_SCHEDULE
    version = 1


class CreateWithInteractionsComponent(BaseComponent):
    category = ComponentCategory.BUTTON
    operation = OperationType.CREATE
    uuid_from_name = True
