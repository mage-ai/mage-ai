from typing import List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.blocks.factory import BlockFactory
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.factory import FileFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.pipelines.factory import PipelineFactory
from mage_ai.command_center.support.constants import ITEMS as ITEMS_SUPPORT
from mage_ai.command_center.triggers.factory import TriggerFactory
from mage_ai.command_center.version_control.factory import VersionControlFactory

FACTORIES_OR_ITEMS = [
    ApplicationFactory,
    BlockFactory,
    FileFactory,
    ITEMS_SUPPORT,
    PipelineFactory,
    TriggerFactory,
    VersionControlFactory,
]


async def search_items(**kwargs) -> List[Item]:
    return await BaseFactory.create_items(FACTORIES_OR_ITEMS, **kwargs)
