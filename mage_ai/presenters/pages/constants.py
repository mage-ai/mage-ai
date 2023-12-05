from functools import reduce
from typing import Dict

from mage_ai.presenters.pages.models.client_pages.pipeline_schedules import (
    CreatePage as PipelineSchedulesCreatePage,
)
from mage_ai.presenters.pages.models.client_pages.pipeline_schedules import (
    ListPage as PipelineSchedulesListPage,
)
from mage_ai.presenters.pages.models.client_pages.pipelines import (
    DetailPage as PipelinesDetailPage,
)
from mage_ai.presenters.pages.models.client_pages.pipelines import (
    ListPage as PipelinesListPage,
)


def _combine(acc, model) -> Dict:
    acc[model.get_uuid()] = model
    return acc


CLIENT_PAGES = reduce(_combine, [
    PipelineSchedulesCreatePage,
    PipelineSchedulesListPage,
    PipelinesDetailPage,
    PipelinesListPage,
], {})
