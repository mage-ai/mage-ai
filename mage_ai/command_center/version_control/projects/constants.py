from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.presenters.interactions.constants import InteractionInputType


def build_create_project() -> Dict:
    return dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.PROJECT,
        title='New Git project',
        description='Initialize Git in a folder to start pulling or pushing code.',
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='Categories',
            ),
        ),
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
                        label='Initialize repo',
                        tooltip='Save changes and create the new project.',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                            ButtonActionType.RESET_FORM,
                            ButtonActionType.CLOSE_APPLICATION,
                            ButtonActionType.SELECT_ITEM_FROM_REQUEST,
                        ],
                    ),
                ],
                settings=[
                    dict(
                        label='Directory',
                        description='The directory to initialize Git in.',
                        placeholder='e.g. project/magic',
                        display_settings=dict(
                            icon_uuid='Folder',
                        ),
                        name='request.payload.version_control_project.uuid',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_model',
                    ),
                ],
                configurations=dict(
                    interaction_parsers={
                        'files.click.folder': dict(
                            action_uuid='create_model',
                            name='request.payload.version_control_project.uuid',
                        ),
                    },
                    requests=dict(
                        files=dict(
                            operation=OperationType.LIST,
                            resource='files',
                            response_resource_key='files',
                        ),
                    ),
                ),
                uuid='model_detail_list',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        version_control_project=dict(
                            uuid=None,
                        ),
                    ),
                    resource='version_control_projects',
                    response_resource_key='version_control_project',
                ),
                uuid='create_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )
