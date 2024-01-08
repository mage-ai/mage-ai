import urllib.parse
from pathlib import Path
from typing import Dict, List, Tuple

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.command_center.utils import shorten_directory


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
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.DETAIL,
                            resource='blocks',
                            resource_id=urllib.parse.quote_plus(uuid or ''),
                            response_resource_key='block',
                            query=dict(
                                file_path=urllib.parse.quote_plus(file_path or ''),
                            ),
                        ),
                        uuid='block_detail',
                    ),
                ],
                buttons=buttons,
                uuid='model_detail',
            ),
        ],
        actions=actions,
    )


async def build_and_score(
    factory,
    data_input: Tuple[str, Dict],
    items: List[Dict],
    add_application: bool = False,
):
    uuid, data = data_input
    block = data.get('block') or {}
    pipelines = [d.get('pipeline') for d in (data.get('pipelines') or [])]

    file_path = block.get('file_path') or f'{uuid}'
    if not Path(file_path).suffix:
        file_path = f'{file_path}.py'

    path_dict = shorten_directory(file_path)
    directory = path_dict.get('directory')

    title = block.get('name') or uuid
    parts = []
    if block.get('name'):
        parts = Path(block.get('name')).parts
    elif uuid:
        parts = Path(uuid).parts

    if parts:
        title = parts[len(parts) - 1]

    description = directory
    if len(pipelines) == 1:
        description = f'{description} in 1 pipeline'
    else:
        description = f'{description} in {len(pipelines)} pipelines'

    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.BLOCK,
        title=title,
        description=description,
        uuid=uuid,
        metadata=dict(
            block=dict(
                file_path=file_path,
                language=block.get('language'),
                pipelines=pipelines,
                type=block.get('type'),
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

    if add_application:
        item_dict.update(add_application_actions(item_dict))

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)
