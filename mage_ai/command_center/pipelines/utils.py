import urllib.parse
from typing import Dict, List, Tuple

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.data_preparation.models.constants import PIPELINE_TYPE_DISPLAY_NAME_MAPPING


def add_application_actions(item_dict: Dict) -> Dict:
    metadata = (item_dict.get('metadata') or {}).get('pipeline') or {}
    uuid = metadata.get('uuid')

    application_action = dict(
        request=dict(
            operation=OperationType.DETAIL,
            resource='pipelines',
            resource_id=urllib.parse.quote_plus(uuid or ''),
            response_resource_key='pipeline',
            query=dict(
                include_block_pipelines=True,
                include_schedules=True,
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
                actions=[application_action],
                uuid='model_detail_list',
            ),
            dict(
                application_type=ApplicationType.DETAIL,
                actions=[application_action],
                buttons=[
                    dict(
                        label='Open pipeline',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.CUSTOM_ACTIONS,
                        ],
                        actions=[
                            dict(
                                page=dict(
                                    path=f'/pipelines/{uuid}/edit',
                                ),
                                uuid='open_model',
                            ),
                        ],
                    ),
                ],
                uuid='model_detail',
            ),
        ],
    )


async def build_and_score(factory, data_input: Tuple[str, Dict], items: List[Dict]):
    project_uuid, data = data_input
    pipeline = data.get('pipeline')

    pipeline_type = pipeline.get('type')
    repo_path = pipeline.get('repo_path')
    title = pipeline.get('name') or pipeline.get('uuid')
    description = pipeline.get('description')
    blocks = pipeline.get('blocks')

    if not description:
        type_label = PIPELINE_TYPE_DISPLAY_NAME_MAPPING.get(pipeline_type)
        if type_label:
            description = f'{type_label} pipeline'

            blocks_count = len(blocks or [])
            if blocks_count:
                description = f'{description} w/ {blocks_count} block'
                if blocks_count >= 2:
                    description = f'{description}s'
            elif repo_path:
                description = f'{description} in {repo_path}'

    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.PIPELINE,
        title=title,
        description=description,
        uuid=project_uuid,
        metadata=dict(
            pipeline=dict(
                blocks=blocks,
                description=pipeline.get('description'),
                name=pipeline.get('name'),
                repo_path=repo_path,
                tags=pipeline.get('tags'),
                type=pipeline_type,
                updated_at=pipeline.get('updated_at'),
                uuid=pipeline.get('uuid'),
            ),
        ),
        display_settings_by_attribute=dict(
            description=dict(
                text_styles=dict(
                    monospace=True,
                    small=True,
                ),
            ),
        ),
    )

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)
