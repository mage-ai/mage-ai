from typing import Dict

from mage_ai.command_center.constants import (
    ApplicationExpansionUUID,
    ApplicationType,
    InteractionType,
    ItemType,
    ObjectType,
)
from mage_ai.command_center.presenters.text import application_title


async def build_close_application(uuid: ApplicationExpansionUUID) -> Dict:
    title = application_title(uuid)

    return dict(
        uuid=f'close_application_{uuid}',
        item_type=ItemType.ACTION,
        object_type=ObjectType.APPLICATION_EXPANSION,
        title=f'Close {title} application',
        subtitle='Close app',
        display_settings_by_attribute=dict(
            icon=dict(color_uuid='monotone.whiteTransparent', icon_uuid='CubeWithArrowDown'),
        ),
        actions=[
            dict(
                interaction=dict(
                    type=InteractionType.CLOSE_APPLICATION,
                ),
            ),
            dict(
                interaction=dict(
                    type=InteractionType.FETCH_ITEMS,
                ),
            ),
        ],
        metadata=dict(
            application=dict(
                application_type=ApplicationType.EXPANSION,
                uuid=uuid,
            ),
        ),
    )
