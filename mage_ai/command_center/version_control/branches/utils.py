import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    InteractionType,
    ItemType,
    ObjectType,
)
from mage_ai.version_control.models import Branch


async def build(factory, model: Branch) -> Dict:
    uuid = model.name
    project = model.project
    description = None

    if model.current:
        description = 'current'
    else:
        description = 'open this branch to switch'

    return dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.BRANCH,
        title=uuid,
        description=description,
        uuid=uuid,
        metadata=dict(
            branch=dict(
                current=model.current,
                name=model.name,
            ),
            project=dict(
                repo_path=project.repo_path,
                uuid=project.uuid,
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
        applications=[
            dict(
                uuid='model_detail_list',
                application_type=ApplicationType.DETAIL_LIST,
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.DETAIL,
                            resource='version_control_branches',
                            resource_id=urllib.parse.quote_plus(uuid or ''),
                            resource_parent='version_control_projects',
                            resource_parent_id=urllib.parse.quote_plus(project.uuid or ''),
                            response_resource_key='version_control_branch',
                        ),
                        uuid='model_detail',
                    ),
                ],
            ),
        ],
    )


async def build_and_score_detail(factory, model: Branch, items: List[Dict]):
    uuid = model.name
    project = model.project

    item_dict = await build(factory, model)
    item_dict['applications'] = None
    item_dict['description'] = 'to switch and make this the current branch'

    if not model.current:
        item_dict['item_type'] = ItemType.ACTION
        item_dict['title'] = 'Checkout'
        item_dict['actions'] = [
            dict(
                request=dict(
                    operation=OperationType.UPDATE,
                    payload=dict(
                        version_control_branch=dict(
                            checkout=True,
                        ),
                    ),
                    resource='version_control_branches',
                    resource_id=urllib.parse.quote_plus(uuid or ''),
                    resource_parent='version_control_projects',
                    resource_parent_id=urllib.parse.quote_plus(project.uuid or ''),
                    response_resource_key='version_control_branch'
                ),
                uuid='update_model',
            ),
            dict(
                interaction=dict(
                    item=dict(
                        uuid=uuid,
                    ),
                    type=InteractionType.FETCH_ITEMS,
                ),
                options=dict(
                ),
                upstream_action_value_key_mapping=dict(
                    update_model={
                        'data.version_control_branch.current': '.'.join([
                            'interaction',
                            'options',
                            'item',
                            'metadata',
                            'branch',
                            'current',
                        ]),
                    }
                ),
                uuid=InteractionType.FETCH_ITEMS,
            ),
            # What was this used for?
            # dict(
            #     interaction=dict(
            #         item=dict(
            #             uuid=uuid,
            #         ),
            #         type=InteractionType.SELECT_ITEM,
            #     ),
            #     uuid='select_item',
            # ),
        ]

        scored = factory.filter_score(item_dict)
        if scored:
            items.append(scored)


async def build_and_score(factory, model: Branch, items: List[Dict]):
    item_dict = await build(factory, model)
    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)
