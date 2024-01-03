import urllib.parse
from typing import Dict, List

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
from mage_ai.version_control.models import Branch, Project


async def build_create(factory, model: Project, items: List[Dict]):
    item_dict = dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.BRANCH,
        title='Create a new branch',
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
                        label='Create new branch',
                        tooltip='Save changes and create the new branch.',
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
                        label='Name',
                        description='New branch name.',
                        display_settings=dict(
                            icon_uuid='BranchAlt',
                        ),
                        placeholder='e.g. mage--new_powers',
                        name='request.payload.version_control_branch.name',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_model',
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
                        version_control_branch=dict(
                            name=None,
                        ),
                    ),
                    resource='version_control_branches',
                    resource_parent='version_control_projects',
                    resource_parent_id=urllib.parse.quote_plus(model.uuid or ''),
                    response_resource_key='version_control_branch'
                ),
                uuid='create_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    if scored:
        scored['score'] += 101
        items.append(scored)


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
            icon=dict(
                color_uuid='background.success',
            ) if model.current else None,
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

    item_dicts = []

    if not model.current:
        item_dict = await build(factory, model)
        item_dict['applications'] = None
        item_dict['description'] = 'to switch and make this the current branch'
        item_dict['item_type'] = ItemType.ACTION
        item_dict['title'] = 'Checkout'
        item_dict['display_settings_by_attribute'] = dict(
            icon=dict(
                icon_uuid='PanelCollapseRight',
                color_uuid='background.success',
            ),
        )

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
        item_dicts.append(item_dict)

    item_dicts.extend([
        dict(
            item_type=ItemType.DELETE,
            object_type=ObjectType.BRANCH,
            title='Delete branch',
            display_settings_by_attribute=dict(
                icon=dict(
                    icon_uuid='Trash',
                    color_uuid='accent.negative',
                ),
            ),
            actions=[
                dict(
                    request=dict(
                        operation=OperationType.DELETE,
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
                        type=InteractionType.CLOSE_APPLICATION,
                    ),
                    uuid='close_application',
                ),
            ],
            condition=lambda opts: FilePolicy(
                None,
                opts.get('user'),
            ).has_at_least_editor_role(),
        ),
    ])

    for item_dict in item_dicts:
        scored = factory.filter_score(item_dict)
        if scored:
            items.append(scored)


async def build_and_score(factory, model: Branch, items: List[Dict]):
    item_dict = await build(factory, model)
    scored = factory.filter_score(item_dict)
    if scored:
        if model.current:
            scored['score'] += 100
        items.append(scored)
