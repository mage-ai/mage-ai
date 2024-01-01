from typing import Dict, List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.blocks.factory import BlockFactory
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.factory import FileFactory
from mage_ai.command_center.models import Application, Item
from mage_ai.command_center.pipelines.factory import PipelineFactory
from mage_ai.command_center.support.constants import ITEMS as ITEMS_SUPPORT
from mage_ai.command_center.triggers.factory import TriggerFactory
from mage_ai.orchestration.db.models.oauth import User

FACTORIES_OR_ITEMS = [
    PipelineFactory,
    BlockFactory,
    ApplicationFactory,
    FileFactory,
    TriggerFactory,
    ITEMS_SUPPORT,
]


async def search_items(
    application: Application = None,
    component: str = None,
    item: Item = None,
    page: str = None,
    page_history: List[Dict] = None,
    picks: str = None,
    search: str = None,
    search_history: List[Dict] = None,
    user: User = None,
) -> List[Item]:
    return await BaseFactory.create_items(
        FACTORIES_OR_ITEMS,
        application=application,
        component=component,
        item=item,
        page=page,
        page_history=page_history,
        picks=picks,
        search=search,
        search_history=search_history,
        user=user,
    )
