import urllib.parse
from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import ApplicationType, ButtonActionType


def add_application_actions(item_dict: Dict) -> Dict:
    metadata = (item_dict.get('metadata') or {}).get('pipeline') or {}
    uuid = metadata.get('uuid')

    application_action = dict(
        request=dict(
            operation=OperationType.DETAIL,
            resource='pipelines',
            resource_id=urllib.parse.quote_plus(uuid),
            response_resource_key='pipeline',
            query=dict(
                include_block_pipelines=True,
                includes_outputs=True,
                includes_outputs_spark=True,
            ),
        ),
        uuid='model_detail',
    )

    return dict(
        applications=[
            dict(
                application_type=ApplicationType.DETAIL_LIST,
                action=application_action,
                buttons=[
                    dict(
                        label='View pipeline details',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.ADD_APPLICATION,
                        ],
                    ),
                ],
                uuid='model_detail_list',
            ),
            dict(
                application_type=ApplicationType.DETAIL,
                action=application_action,
                buttons=[
                    dict(
                        label='Open pipeline',
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
                page=dict(
                    path=f'/pipelines/{uuid}/edit',
                ),
                uuid='open_model',
            ),
        ],
    )
