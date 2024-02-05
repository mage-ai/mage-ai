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
    RenderLocationType,
)
from mage_ai.command_center.shared.utils import build_delete, build_input, build_update
from mage_ai.command_center.version_control.shared.utils import (
    add_validate_output_error_fatal,
)
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.version_control.models import Branch, Project, Remote


def branch_metadata(model: Branch) -> Dict:
    return dict(
        branch=dict(
            current=model.current,
            name=model.name,
        ),
        project=dict(
            repo_path=model.project.repo_path,
            uuid=model.project.uuid,
        ),
    )


def build_request(model: Branch = None, project: Project = None) -> Dict:
    base = dict(
        resource='version_control_branches',
        resource_parent='version_control_projects',
        resource_parent_id=urllib.parse.quote_plus((project or model.project).uuid or ''),
        response_resource_key='version_control_branch'
    )
    if model:
        base.update(dict(resource_id=urllib.parse.quote_plus(model.name or '')))
    return base


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
                render_options=dict(location=RenderLocationType.ITEMS_CONTAINER_AFTER),
            ),
            dict(
                interaction=dict(
                    type=InteractionType.FETCH_ITEMS,
                ),
                upstream_action_value_key_mapping=dict(
                    create_branch={
                        'version_control_branch.name': '.'.join([
                            'interaction',
                            'item',
                            'uuid',
                        ]),
                    },
                ),
                uuid=InteractionType.FETCH_ITEMS,
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
        metadata=branch_metadata(model),
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
                render_options=dict(location=RenderLocationType.ITEMS_CONTAINER_AFTER),
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
                upstream_action_value_key_mapping=dict(
                    update_branch={
                        'version_control_branch.current': '.'.join([
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

    for item_dict in item_dicts:
        scored = factory.filter_score(item_dict)
        if scored:
            items.append(scored)


async def build_and_score(factory, model: Branch, items: List[Dict]):
    item_dict = await build(factory, model)
    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)


async def build_clone(
    factory,
    items: List[Dict],
    model: Branch = None,
    project: Project = None,
):
    remotes = Remote.load_all(project=project or model.project)

    if model:
        current_branch = model.get_current_branch()
        if not current_branch:
            return

        title = f'Clone this branch into {current_branch.name}'
        description = f'git clone -b {model.name}'
    else:
        title = 'Clone remote branch'
        description = 'git clone -b [branch] [remote]'

    factory.filter_score_mutate_accumulator(
        build_update(
            item_dict=dict(
                item_type=ItemType.ACTION,
                object_type=ObjectType.BRANCH,
                title=title,
                description=description,
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
            model=project or model,
            request=dict(
                operation=OperationType.CREATE,
                payload=dict(version_control_branch=dict(clone=True)),
            ) | build_request(model=model, project=project),
            settings=([] if model else [
                dict(
                    label='Branch to clone',
                    placeholder='e.g. master',
                    name='request.payload.version_control_branch.name',
                    display_settings=dict(icon_uuid='BranchAlt'),
                    monospace=True,
                    required=True,
                    type=InteractionInputType.TEXT_FIELD,
                ),
            ]) + [
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


async def build_delete_branch(model: Branch, items: List[Dict]):
    item_dict = build_delete(
        model=model,
        item_dict=dict(
            object_type=ObjectType.BRANCH,
            title='Delete branch',
            description=model.name,
            subtitle='git branch -d',
        ),
        request=dict(
            resource='version_control_branches',
            resource_id=urllib.parse.quote_plus(model.name or ''),
            resource_parent='version_control_projects',
            resource_parent_id=urllib.parse.quote_plus(model.project.uuid or ''),
            response_resource_key='version_control_branch'
        ),
    )

    return add_validate_output_error_fatal(item_dict)


async def build_branch_generic_action(model: Branch, items: List[Dict], action_label: str):
    remotes = Remote.load_all(project=model.project)
    branches = Branch.load_all(project=model.project)

    item_dict = dict(
        item_type=ItemType.ACTION,
        object_type=ObjectType.BRANCH,
        title=action_label.capitalize(),
        subtitle=f'git {action_label}',
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='accent.sky',
                icon_uuid='CubeWithArrowDown',
            ),
            subtitle=dict(
                text_styles=dict(monospace=True),
            ),
        ),
    )

    item_dict = build_update(
        model=model,
        item_dict=item_dict,
        mapping={
            'data.version_control_branch': '.'.join([
                'interaction',
                'options',
                'item',
                'metadata',
                'branch',
            ]),
        },
        request=dict(
            operation=OperationType.UPDATE,
            payload=dict(version_control_branch={
                action_label: True,
            }),
            resource='version_control_branches',
            resource_parent='version_control_projects',
            response_resource_key='version_control_branch',
        ) | build_request(model=model, project=model.project),
        settings=[
            build_input(
                model=model,
                item_dict=item_dict,
                label='Remote',
                description='The remote repository to perform this action on.',
                display_settings=dict(
                    icon_uuid='PlugAPI',
                ),
                name='request.query.remote',
                required=True,
                monospace=True,
                placeholder='e.g. origin',
                type=InteractionInputType.DROPDOWN_MENU,
                options=[
                    dict(
                        label=remote.name,
                        value=remote.name,
                    ) for remote in remotes
                ],
            ),
            build_input(
                model=model,
                item_dict=item_dict,
                label='Branch',
                description='Name of the branch to perform this action on.',
                display_settings=dict(
                    icon_uuid='BranchAlt',
                ),
                name='request.resource_id',
                placeholder='e.g. master',
                type=InteractionInputType.DROPDOWN_MENU,
                options=[
                    dict(
                        label=b.name,
                        value=b.name,
                    ) for b in branches
                ],
                required=True,
                monospace=True,
            ),
        ],
    )

    item_dict['applications'][0]['buttons'][-1]['label'] = action_label.capitalize()

    item_dict['actions'].extend([
        dict(
            interaction=dict(type=InteractionType.RESET_FORM),
            uuid=f'reset_form_{model.name}',
        ),
        dict(
            interaction=dict(type=InteractionType.CLOSE_APPLICATION),
            uuid=f'reset_form_{model.name}',
        ),
    ])

    return add_validate_output_error_fatal(item_dict)


async def build_pull(model: Branch, items: List[Dict]) -> Dict:
    return await build_branch_generic_action(model, items, 'pull') | dict(
        title='Pull remote branch into',
        description=model.name,
    )


async def build_push(model: Branch, items: List[Dict]) -> Dict:
    item_dict = await build_branch_generic_action(model, items, 'push') | dict(
        title='Push current branch to remote',
    )
    item_dict['display_settings_by_attribute'] = dict(
        icon=dict(
            icon_uuid='CircleWithArrowUp',
            color_uuid='accent.cyan',
        ),
    )

    item_dict['applications'][0]['settings'] = item_dict['applications'][0]['settings'][:1]

    return item_dict


async def build_rebase(model: Branch, items: List[Dict]) -> Dict:
    item_dict = await build_branch_generic_action(model, items, 'rebase') | dict(
        title='Rebase a local or remote branch into',
        description=model.name,
    )
    item_dict['display_settings_by_attribute'] = dict(
        icon=dict(
            icon_uuid='VersionControlRebase',
            color_uuid='accent.teal',
        ),
    )

    remote = item_dict['applications'][0]['settings'][0]
    remote['label'] = 'Remote (optional)'
    remote['description'] = 'Leave the remote blank to rebase from a local branch.'
    remote['options'] = [dict(label='', value='')] + remote['options']
    branch = item_dict['applications'][0]['settings'][1]

    item_dict['applications'][0]['settings'] = [branch, remote]

    return item_dict


async def build_merge(model: Branch, items: List[Dict]) -> Dict:
    item_dict = await build_branch_generic_action(model, items, 'merge') | dict(
        title='Merge a local or remote branch into',
        description=model.name,
    )
    item_dict['display_settings_by_attribute'] = dict(
        icon=dict(
            icon_uuid='VersionControlMerge',
            color_uuid='accent.purpleLight',
        ),
    )

    remote = item_dict['applications'][0]['settings'][0]
    remote['label'] = 'Remote (optional)'
    remote['description'] = 'Leave the remote blank to merge from a local branch.'
    remote['options'] = [dict(label='', value='')] + remote['options']
    branch = item_dict['applications'][0]['settings'][1]

    item_dict['applications'][0]['settings'] = [branch, remote]

    return item_dict
