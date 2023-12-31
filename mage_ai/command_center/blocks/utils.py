import urllib.parse
from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import ApplicationType, ButtonActionType


def add_application_actions(item_dict: Dict) -> Dict:
    uuid = item_dict.get('uuid')
    block_metadata = (item_dict.get('metadata') or {}).get('block') or {}
    file_path = block_metadata.get('file_path')

    actions = []
    buttons = []
    pipelines = block_metadata.get('pipelines')
    if pipelines:
        pipeline_uuid = pipelines[0].get('uuid')
        actions.append(dict(
            page=dict(
                path=f'/pipelines/{pipeline_uuid}/edit',
            ),
            uuid='open_block_in_pipeline',
        ))
        buttons.append(dict(
            label='Open block in pipeline',
            keyboard_shortcuts=[[13]],
            action_types=[
                ButtonActionType.EXECUTE,
            ],
        ))

    return dict(
        applications=[
            dict(
                application_type=ApplicationType.DETAIL,
                action=dict(
                    request=dict(
                        operation=OperationType.DETAIL,
                        resource='blocks',
                        resource_id=urllib.parse.quote_plus(uuid),
                        response_resource_key='block',
                        query=dict(
                            file_path=urllib.parse.quote_plus(file_path),
                        ),
                    ),
                    uuid='block_detail',
                ),
                buttons=buttons,
                uuid='model_detail',
            ),
        ],
        actions=actions,
    )
