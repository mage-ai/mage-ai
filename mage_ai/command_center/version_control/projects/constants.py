from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.models import (
    ApplicationType,
    ButtonActionType,
    InteractionInputType,
)

ITEMS = [
    dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.PROJECT,
        title='New Git project',
        description='Initialize Git in a folder to start pulling or pushing code.',
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='DiamondDetached',
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
                uuid='model_detail_list',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        version_control_project=dict(
                            name=None,
                            type=None,
                        ),
                    ),
                    resource='version_control_projects',
                    response_resource_key='version_control_project'
                ),
                uuid='create_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    ),
]
