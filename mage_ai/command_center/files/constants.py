from mage_ai.api.operations.constants import OperationType
from mage_ai.api.utils import has_at_least_editor_role
from mage_ai.command_center.constants import CommandCenterItemType, InteractionType
from mage_ai.presenters.interactions.constants import InteractionInputType

ITEMS = [
    dict(
        title='Create a new file',
        type=CommandCenterItemType.ACTION,
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    resource='files',
                    response_resource_key='file',
                    payload_keys_user_input_required=dict(
                        dir_path=dict(
                            label='Directory',
                            type=InteractionInputType.TEXT_FIELD,
                        ),
                        name=dict(
                            label='File name',
                            type=InteractionInputType.TEXT_FIELD,
                        ),
                    ),
                    payload_resource_key='file',
                ),
            ),
            dict(
                interaction=dict(
                    options=dict(
                        file_path='default_repo/dbt/demo/models/example/my_first_dbt_model.sql',
                    ),
                    type=InteractionType.OPEN_FILE,
                ),
                parent_action_result_key_value_mapping={
                    'file.path': 'interaction.options.file_path',
                },
            ),
        ],
        condition=lambda opts: has_at_least_editor_role(
            user=opts.get('user'),
        ),
    ),
    dict(
        title='Create a new folder',
        type=CommandCenterItemType.ACTION,
        icon_uuid='FolderOutline',
    ),
]
