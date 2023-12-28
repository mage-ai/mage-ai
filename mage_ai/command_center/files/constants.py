from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
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
            settings=[
                dict(
                    label='Directory',
                    description='Where do you want to save this file?',
                    placeholder='e.g. utils',
                    icon_uuid='FolderOutline',
                    name='file.dir_path',
                    type=InteractionInputType.TEXT_FIELD,
                    action_uuid='files_form',
                    required=True,
                ),
                dict(
                    label='File name',
                    description='The name of the file.',
                    icon_uuid='File',
                    placeholder='e.g. magic_powers.py',
                    name='file.name',
                    type=InteractionInputType.TEXT_FIELD,
                    action_uuid='files_form',
                    required=True,
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
                uuid='files_form',
            ),
            dict(
                interaction=dict(
                    options=dict(
                        file_path='default_repo/dbt/demo/models/example/my_first_dbt_model.sql',
                    ),
                    type=InteractionType.OPEN_FILE,
                ),
                upstream_action_value_key_mapping=dict(
                    files_form={
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
