from mage_ai.command_center.constants import ItemType, ModeType

ACTIVATE_MODE = dict(
    item_type=ItemType.MODE_ACTIVATION,
    mode=dict(
        cache_items=False,
        type=ModeType.VERSION_CONTROL,
    ),
    title='Activate version control mode',
    description='Transform into a version control master',
)


DEACTIVATE_MODE = dict(
    item_type=ItemType.MODE_DEACTIVATION,
    mode=dict(
        type=ModeType.VERSION_CONTROL,
    ),
    title='Deactivate current mode',
    description='Shape shift back to a normal sorcerer',
)
