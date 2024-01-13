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
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.version_control.models import Project, Remote


async def build_remote_list(factory, model: Project, items: List[Dict]):
    item_dict = dict(
        item_type=ItemType.LIST,
        object_type=ObjectType.REMOTE,
        title='View all remotes',
        uuid=f'{model.uuid}_remotes',
        metadata=dict(
            project=dict(
                repo_path=model.repo_path,
                uuid=model.uuid,
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
                application_type=ApplicationType.LIST,
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.LIST,
                            resource='version_control_remotes',
                            resource_parent='version_control_projects',
                            resource_parent_id=urllib.parse.quote_plus(model.uuid or ''),
                            response_resource_key='version_control_remote',
                        ),
                        uuid='model_detail',
                    ),
                ],
            ),
        ],
    )

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)


async def build_and_score(factory, model: Remote, items: List[Dict]):
    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.REMOTE,
        title=model.name,
        description=model.url,
        uuid=model.name,
        metadata=dict(
            remote=dict(
                name=model.name,
                url=model.url,
            ),
            project=dict(
                repo_path=model.project.repo_path,
                uuid=model.project.uuid,
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
            ),
        ],
    )

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)


def application_form(
    action_uuid: str,
    button_label: str,
    model: Remote = None,
) -> Dict:
    return dict(
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
                label=button_label,
                tooltip='Save changes.',
                keyboard_shortcuts=[[13]],
                action_types=[
                    ButtonActionType.EXECUTE,
                    ButtonActionType.RESET_FORM,
                    ButtonActionType.CLOSE_APPLICATION,
                ],
            ),
        ],
        settings=[
            dict(
                label='Name',
                display_settings=dict(
                    icon_uuid='Alphabet',
                ),
                placeholder='e.g. origin',
                name='request.payload.version_control_remote.name',
                type=InteractionInputType.TEXT_FIELD,
                required=True,
                monospace=True,
                action_uuid=action_uuid,
                value=model.name if model else None,
            ),
            dict(
                label='URL',
                display_settings=dict(
                    icon_uuid='Alphabet',
                ),
                placeholder='e.g. https://github.com/mage-ai/mage-ai.git',
                name='request.payload.version_control_remote.url',
                type=InteractionInputType.TEXT_FIELD,
                required=True,
                monospace=True,
                action_uuid=action_uuid,
                value=model.url if model else None,
            ),
        ],
        uuid=action_uuid,
    )


async def build_create(factory, model: Project, items: List[Dict]):
    remotes = factory.remotes

    item_dict = dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.REMOTE,
        title='Add a new remote' if remotes else 'Add remote',
        uuid=f'{model.uuid}_create_remote',
        metadata=dict(
            project=dict(
                repo_path=model.repo_path,
                uuid=model.uuid,
            ),
        ),
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='background.success',
            ),
        ),
        applications=[
            application_form('create_remote', 'Create new remote'),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    resource='version_control_remotes',
                    resource_parent='version_control_projects',
                    resource_parent_id=urllib.parse.quote_plus(model.uuid or ''),
                    response_resource_key='version_control_remote',
                ),
                uuid='create_remote',
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


async def build_detail_list(
    factory,
    model: Remote,
    include_delete: bool = False,
    include_fetch: bool = False,
    include_update: bool = False,
) -> List[Dict]:
    def shared_dict(model=model) -> Dict:
        return dict(
            object_type=ObjectType.REMOTE,
            metadata=dict(
                remote=dict(
                    name=model.name,
                    url=model.url,
                ),
                project=dict(
                    repo_path=model.project.repo_path,
                    uuid=model.project.uuid,
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
            condition=lambda opts: FilePolicy(
                None,
                opts.get('user'),
            ).has_at_least_editor_role(),
        )

    def shared_request(model=model) -> Dict:
        return dict(
            resource='version_control_remotes',
            resource_id=urllib.parse.quote_plus(model.name or ''),
            resource_parent='version_control_projects',
            resource_parent_id=urllib.parse.quote_plus(model.project.uuid or ''),
            response_resource_key='version_control_remote',
            query=dict(url=urllib.parse.quote_plus(model.url or '')),
        )

    item_fetch = dict(
        item_type=ItemType.ACTION,
        title='Fetch from remote',
        description=f'git fetch {model.name}',
        uuid=f'{model.name}_fetch',
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='VersionControlFetch',
            ),
        ),
        actions=[
            dict(
                render_options=dict(location=RenderLocationType.ITEMS_CONTAINER_AFTER),
                request=shared_request() | dict(
                    operation=OperationType.UPDATE,
                    payload=dict(version_control_remote=dict(fetch=True)),
                ),
                uuid='fetch_model',
            ),
        ],
    )

    arr = []

    if include_fetch:
        arr.append(item_fetch)

    if include_update:
        arr.append(dict(
            item_type=ItemType.UPDATE,
            title='Update remote configurations',
            uuid=f'{model.name}_update',
            applications=[
                application_form('update_remote', 'Update remote', model),
            ],
            actions=[
                dict(
                    request=shared_request() | dict(
                        operation=OperationType.UPDATE,
                    ),
                    uuid='update_remote',
                ),
            ],
        ))

    if include_delete:
        arr.append(dict(
            item_type=ItemType.DELETE,
            title='Remove remote',
            uuid=f'{model.name}_delete',
            actions=[
                dict(
                    request=shared_request() | dict(
                        operation=OperationType.DELETE,
                    ),
                    uuid='delete_model',
                ),
                dict(
                    interaction=dict(
                        type=InteractionType.CLOSE_APPLICATION,
                    ),
                    uuid='close_application',
                ),
            ],
            display_settings_by_attribute=dict(
                icon=dict(
                    icon_uuid='Trash',
                    color_uuid='accent.negative',
                ),
            ),
        ))

    return [shared_dict() | i for i in arr]


async def build_detail_list_items(factory, model: Remote, items: List[Dict]):
    item_dicts = await build_detail_list(
        factory,
        model,
        include_delete=True,
        include_fetch=True,
        include_update=True,
    )
    for item_dict in item_dicts:
        scored = factory.filter_score(item_dict)
        if scored:
            items.append(scored)
