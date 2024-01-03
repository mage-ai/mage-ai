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
from mage_ai.command_center.version_control.shared.utils import build_update
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.version_control.models import Branch, Project, Remote


def build_request(model: Branch) -> Dict:
    return dict(
        resource='version_control_branches',
        resource_id=urllib.parse.quote_plus(model.name or ''),
        resource_parent='version_control_projects',
        resource_parent_id=urllib.parse.quote_plus(model.project.uuid or ''),
        response_resource_key='version_control_branch'
    )


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
                        action_uuid='create_branch',
                    ),
                ],
                uuid='create_branch',
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
                uuid='create_branch',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    if scored:
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
                uuid='update_branch',
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
                    update_branch={
                        'data.version_control_branch.current': '.'.join([
                            'interaction',
                            'options',
                            'item',
                            'metadata',
                            'branch',
                            'current',
                        ]),
                    },
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
                        uuid='update_branch',
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
        items.append(scored)


async def build_clone(factory, model: Branch, items: List[Dict]):
    current_branch = model.get_current_branch()
    remotes = Remote.load_all(project=model.project)

    factory.filter_score_mutate_accumulator(
        build_update(
            item_dict=dict(
                item_type=ItemType.ACTION,
                object_type=ObjectType.BRANCH,
                title=f'Clone this branch into {current_branch.name}',
                description=f'git clone -b {model.name}',
            ),
            mapping={
                'data.version_control_branch': '.'.join([
                    'interaction',
                    'options',
                    'item',
                    'metadata',
                    'branch',
                ]),
            },
            model=model,
            request=dict(
                operation=OperationType.UPDATE,
                payload=dict(version_control_branch=dict(clone=True)),
            ) | build_request(model),
            settings=[
                dict(
                    label='Remote to clone from',
                    placeholder='e.g. origin',
                    name='request.query.remote',
                    display_settings=dict(icon_uuid='PlugAPI'),
                    required=True,
                    type=InteractionInputType.DROPDOWN_MENU,
                    options=[dict(
                        label=remote.name,
                        value=remote.name,
                    ) for remote in remotes],
                ),
            ],
        ),
        items,
    )
