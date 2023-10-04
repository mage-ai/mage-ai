from mage_ai.api.operations.constants import OperationType
from mage_ai.presenters.pages.constants import ResourceType
from mage_ai.presenters.pages.models.base import ClientPage


class PipelineScheduleCreatePage(ClientPage):
    operation = OperationType.CREATE
    resource = ResourceType.PIPELINE_SCHEDULE
    version = 1
