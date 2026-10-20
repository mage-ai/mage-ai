import urllib.parse
from typing import Dict

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
        applications=[
            dict(
                application_type=ApplicationType.FORM,
                buttons=[
                    dict(
                        label='Cancel',
                        tooltip='Discard changes and go back.',
                        keyboard_shortcuts=[['metaKey', 27]],
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
                        display_settings=dict(
                            icon_uuid='FolderOutline',
                        ),
                        name='request.payload.file.dir_path',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_file',
                    ),
                    dict(
                        label='File name',
                        description='A descriptive name of the file to be created.',
                        display_settings=dict(
                            icon_uuid='File',
                        ),
                        placeholder='e.g. magic_powers.py',
                        name='request.payload.file.name',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_file',
                    ),
                ],
                uuid='new_file',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        file=dict(
                            overwrite=False,
                        ),
                        file_json_only=True,
                    ),
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
                        'file.path': 'interaction.options.file_path',
                    }
                ),
                uuid='open_file',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    ),
    dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.FOLDER,
        title='Create a new folder',
        applications=[
            dict(
                application_type=ApplicationType.FORM,
                buttons=[
                    dict(
                        label='Cancel',
                        tooltip='Discard changes and go back.',
                        keyboard_shortcuts=[['metaKey', 27]],
                        action_types=[
                            ButtonActionType.RESET_FORM,
                            ButtonActionType.CLOSE_APPLICATION,
                        ],
                    ),
                    dict(
                        label='Create new folder',
                        tooltip='Save changes and create the new folder.',
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
                        description='The parent directory of this folder.',
                        placeholder='e.g. utils',
                        display_settings=dict(
                            icon_uuid='FolderOutline',
                        ),
                        name='request.payload.folder.path',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_folder',
                    ),
                    dict(
                        label='Folder name',
                        description='A descriptive name of the folder to be created.',
                        display_settings=dict(
                            icon_uuid='Alphabet',
                        ),
                        placeholder='e.g. transformers',
                        name='request.payload.folder.name',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_folder',
                    ),
                ],
                uuid='new_folder',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        folder=dict(
                            overwrite=False,
                        ),
                    ),
                    resource='folders',
                    response_resource_key='folder'
                ),
                uuid='create_folder',
            ),
            dict(
                page=dict(
                    path='/files',
                ),
                uuid='navigate_folder',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    ),
]


def add_application_actions(item_dict: Dict) -> Dict:
    uuid = item_dict.get('uuid')

    return dict(
        applications=[
            dict(
                application_type=ApplicationType.DETAIL,
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.DETAIL,
                            resource='file_contents',
                            resource_id=urllib.parse.quote_plus(uuid),
                            response_resource_key='file_content',
                        ),
                        uuid='file_content_detail',
                    ),
                ],
                buttons=[
                    dict(
                        label='Open file',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                        ],
                    ),
                ],
                uuid='model_detail',
            ),
        ],
        actions=[
            dict(
                interaction=dict(
                    options=dict(file_path=uuid),
                    type=InteractionType.OPEN_FILE,
                ),
                uuid='open_file',
            ),
        ],
    )
