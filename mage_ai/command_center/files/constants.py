from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    InteractionType,
    ItemType,
    ObjectType,
)
from mage_ai.presenters.interactions.constants import InteractionInputType

ITEMS = [
    dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.FILE,
        title='Create a new file',
        application=dict(
            application_type=ApplicationType.FORM,
            buttons=[
                dict(
                    label='Cancel',
                    tooltip='Discard changes and go back.',
                    keyboard_shortcuts=[[27]],
                    action_types=[
                        ButtonActionType.RESET_FORM,
                        ButtonActionType.CLOSE_APPLICATION,
                    ],
                ),
                dict(
                    label='Create new file',
                    tooltip='Save changes and create the new file.',
                    keyboard_shortcuts=[[13]],
                    action_types=[
                        ButtonActionType.EXECUTE,
                        ButtonActionType.RESET_FORM,
                    ],
                ),
            ],
            settings=[
                dict(
                    label='Directory',
                    description=(
                        'The location to create the file in. '
                        'Must be relative to the top level directory.'
                    ),
                    placeholder='e.g. utils',
                    icon_uuid='FolderOutline',
                    name='request.payload.file.dir_path',
                    type=InteractionInputType.TEXT_FIELD,
                    required=True,
                    monospace=True,
                    action_uuid='create_file',
                ),
                dict(
                    label='File name',
                    description='A descriptive name of the file to be created.',
                    icon_uuid='File',
                    placeholder='e.g. magic_powers.py',
                    name='request.payload.file.name',
                    type=InteractionInputType.TEXT_FIELD,
                    required=True,
                    monospace=True,
                    action_uuid='create_file',
                ),
            ],
        ),
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    resource='files',
                    response_resource_key='file'
                ),
                uuid='create_file',
            ),
            dict(
                interaction=dict(
                    type=InteractionType.OPEN_FILE,
                ),
                upstream_action_value_key_mapping=dict(
                    create_file={
                        'data.file.path': 'interaction.options.file_path',
                    }
                ),
                uuid='open_file',
            ),
        ],
        condition=lambda opts: FilePolicy(None, opts.get('user')).has_at_least_editor_role(),
    ),
    dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.FOLDER,
        title='Create a new folder',
    ),
]
