from mage_ai.command_center.constants import ItemType, ObjectType

ITEMS = [
    dict(
        item_type=ItemType.SUPPORT,
        object_type=ObjectType.DOCUMENT,
        title='Read developer documentation',
        description='Technical documentation for Mage.',
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='background.success',
            ),
        ),
        actions=[
            dict(
                page=dict(
                    path='https://docs.mage.ai',
                    external=True,
                    open_new_window=True,
                ),
                uuid='docs',
            ),
        ],
    ),
    dict(
        item_type=ItemType.SUPPORT,
        object_type=ObjectType.CHAT,
        title='Get instant live support',
        description='Learn best practices, share code snippets, and have fun.',
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='background.success',
            ),
        ),
        actions=[
            dict(
                page=dict(
                    path='https://mage.ai/chat',
                    external=True,
                    open_new_window=True,
                ),
                uuid='chat',
            ),
        ],
    ),
]
