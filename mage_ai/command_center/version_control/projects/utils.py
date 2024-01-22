import copy
import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.api.resources.VersionControlProjectResource import (
    VersionControlProjectResource,
)
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    InteractionType,
    ItemType,
    ObjectType,
    ValidationType,
)
from mage_ai.data_preparation.sync import AuthType
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.version_control.models import Project


async def add_sync_config(factory, model: Project) -> Project:
    resource = await VersionControlProjectResource.member(model.uuid, factory.user)
    model.sync_config = resource.model.sync_config
    return model


def build_auth_type_settings_input(sync_config: Dict) -> Dict:
    return dict(
        label='Authentication type',
        description='How do you want to authenticate when interacting with the remote repository?',
        display_settings=dict(
            icon_uuid='Alphabet',
        ),
        name='request.payload.version_control_project.sync_config.auth_type',
        required=True,
        action_uuid='update_project',
        type=InteractionInputType.DROPDOWN_MENU,
        placeholder='e.g. SSH, HTTPS',
        options=[
            dict(
                label='SSH (public and private keys)',
                value=AuthType.SSH,
            ),
            dict(
                label='Application access token (HTTPS)',
                value=AuthType.HTTPS,
            ),
            dict(
                label='OAuth',
                value=AuthType.OAUTH,
            ),
        ],
        value=sync_config.get('auth_type'),
    )


async def build_update(factory, model: Project, items: List[Dict]):
    model = await add_sync_config(factory, model)
    sync_config = model.sync_config
    user_git_settings = sync_config.get('user_git_settings') or {}

    shared_form_settings = [
        build_auth_type_settings_input(sync_config),
        dict(
            label='Remote repository URL',
            description=(
                'You will need to set up your SSH key if you have not done so '
                'already.'
            ),
            display_settings=dict(
                icon_uuid='ParentLinked',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'remote_repo_link',
            ),
            required=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. https://github.com/mage-ai/mage-ai.git',
            value=sync_config.get('remote_repo_link'),
        ),
        dict(
            label='Local directory path',
            description=(
                'Defaults to Python’s os.getcwd() if omitted. Mage will create '
                'this local directory if it doesn’t already exist.'
            ),
            display_settings=dict(
                icon_uuid='ParentLinked',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'repo_path',
            ),
            required=True,
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. /home/src/super_project',
            value=sync_config.get('repo_path'),
        ),
    ]
    shared_form_settings_ssh = [
        dict(
            label='SSH public key',
            description=(
                'Run cat ~/.ssh/id_ed25519.pub | base64 | tr -d \\n | echo in '
                'terminal to get base64 encoded public key and paste the result '
                'here. The key will be stored as a Mage secret.'
            ),
            display_settings=dict(
                icon_uuid='Secrets',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'ssh_public_key',
            ),
            monospace=True,
            required=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='SSH public key in base64',
        ),
        dict(
            label='SSH private key',
            description=(
                'Follow same steps as the public key, '
                'but run cat ~/.ssh/id_ed25519 | base64 | tr -d \\n && echo '
                'instead. The key will be stored as a Mage secret.'
            ),
            display_settings=dict(
                icon_uuid='Secrets',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'ssh_private_key',
            ),
            style=dict(multiline=True),
            monospace=True,
            required=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='SSH private key in base64',
        ),
        dict(
            label='Access token (required for HTTPS)',
            description=(
                'Add your Git access token to authenticate with your provided username. '
                'The access token will be stored as a Mage secret.'
            ),
            display_settings=dict(
                icon_uuid='Secrets',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'access_token',
            ),
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. xxxxxxxxxxxxxxxxxxxx',
        ),
    ]

    git_sync_settings_shared = dict(
        item_type=ItemType.UPDATE,
        object_type=ObjectType.PROJECT,
        title='2-way git sync settings',
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='Once',
            ),
        ),
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
                        label='Update sync settings',
                        tooltip='Save changes and update.',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                            ButtonActionType.CLOSE_APPLICATION,
                        ],
                    ),
                ],
                settings=copy.deepcopy(shared_form_settings) + [
                    dict(
                        label='Username',
                        description=(
                            'These fields are required to help Mage configure your Git '
                            'settings. These settings will be specific to your user.'
                        ),
                        display_settings=dict(
                            icon_uuid='Alphabet',
                        ),
                        name=(
                            'request.payload.version_control_project.sync_config.'
                            'user_git_settings.username',
                        ),
                        required=True,
                        action_uuid='update_project',
                        type=InteractionInputType.TEXT_FIELD,
                        placeholder='e.g. paladin',
                        value=user_git_settings.get('username'),
                    ),
                    dict(
                        label='Email',
                        description=(
                            'These fields are required to help Mage configure your Git '
                            'settings. These settings will be specific to your user.'
                        ),
                        display_settings=dict(
                            icon_uuid='Email',
                        ),
                        name=(
                            'request.payload.version_control_project.sync_config.'
                            'user_git_settings.email',
                        ),
                        required=True,
                        action_uuid='update_project',
                        type=InteractionInputType.TEXT_FIELD,
                        placeholder='e.g. paladin@storm.com',
                        value=user_git_settings.get('email'),
                    ),
                ] + copy.deepcopy(shared_form_settings_ssh),
                uuid='update_project',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.UPDATE,
                    payload=dict(
                        version_control_project={},
                    ),
                    resource='version_control_projects',
                    resource_id=urllib.parse.quote_plus(model.uuid or ''),
                    response_resource_key='version_control_project',
                ),
                uuid='update_project',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    git_sync_2_way = copy.deepcopy(git_sync_settings_shared)
    git_sync_2_way['actions'][0]['uuid'] = 'update_model_git_sync_2'
    git_sync_2_way['applications'][0]['uuid'] = git_sync_2_way['actions'][0]['uuid']
    for idx, settings in enumerate(git_sync_2_way['applications'][0]['settings']):
        settings['action_uuid'] = git_sync_2_way['actions'][0]['uuid']
        git_sync_2_way['applications'][0]['settings'][idx] = settings

    git_sync_1_way = copy.deepcopy(git_sync_settings_shared)
    git_sync_1_way['title'] = '1-way git sync settings'
    git_sync_1_way['applications'][0]['settings'] = copy.deepcopy(shared_form_settings) + [
        dict(
            label='Branch name',
            description=(
                'Sync with a specified branch.'
            ),
            display_settings=dict(
                icon_uuid='BranchAlt',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'branch',
            ),
            required=True,
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. mage--new_powers',
            value=sync_config.get('branch'),
        ),
        dict(
            label='Include submodules',
            display_settings=dict(
                icon_uuid='BranchAlt',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'sync_submodules',
            ),
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.SWITCH,
            value=sync_config.get('sync_submodules'),
        ),
        dict(
            label='Sync before each trigger run',
            display_settings=dict(
                icon_uuid='BranchAlt',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'sync_on_pipeline_run',
            ),
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.SWITCH,
            value=sync_config.get('sync_on_pipeline_run'),
        ),
        dict(
            label='Sync on server start up',
            display_settings=dict(
                icon_uuid='BranchAlt',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'sync_on_start',
            ),
            monospace=True,
            action_uuid='update_project',
            type=InteractionInputType.SWITCH,
            value=sync_config.get('sync_on_start'),
        ),
        dict(
            label='Username',
            description=(
                'These fields are required to help Mage configure your Git '
                'settings. These settings will be specific to your user.'
            ),
            display_settings=dict(
                icon_uuid='Alphabet',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'username',
            ),
            required=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. paladin',
            value=sync_config.get('username'),
        ),
        dict(
            label='Email',
            description=(
                'These fields are required to help Mage configure your Git '
                'settings. These settings will be specific to your user.'
            ),
            display_settings=dict(
                icon_uuid='Email',
            ),
            name=(
                'request.payload.version_control_project.sync_config.'
                'email',
            ),
            required=True,
            action_uuid='update_project',
            type=InteractionInputType.TEXT_FIELD,
            placeholder='e.g. paladin@storm.com',
            value=sync_config.get('email'),
        ),
    ] + copy.deepcopy(shared_form_settings_ssh)

    git_sync_1_way['actions'][0]['uuid'] = 'update_model_git_sync_1'
    git_sync_1_way['applications'][0]['uuid'] = git_sync_1_way['actions'][0]['uuid']
    for idx, settings in enumerate(git_sync_1_way['applications'][0]['settings']):
        settings['action_uuid'] = git_sync_1_way['actions'][0]['uuid']
        git_sync_1_way['applications'][0]['settings'][idx] = settings

    item_dicts = [
        dict(
            item_type=ItemType.UPDATE,
            object_type=ObjectType.PROJECT,
            title='Set global configurations',
            description='Update the authentication method, global user.name, and user.email',
            display_settings_by_attribute=dict(
                icon=dict(
                    icon_uuid='Alphabet',
                ),
            ),
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
                            label='Update global configurations',
                            tooltip='Save changes and update.',
                            keyboard_shortcuts=[[13]],
                            action_types=[
                                ButtonActionType.EXECUTE,
                                ButtonActionType.CLOSE_APPLICATION,
                            ],
                        ),
                    ],
                    settings=[
                        dict(
                            label='Name',
                            description='config --global user.name',
                            placeholder='e.g. wizard',
                            display_settings=dict(
                                icon_uuid='Alphabet',
                            ),
                            name='request.payload.version_control_project.name',
                            type=InteractionInputType.TEXT_FIELD,
                            required=True,
                            monospace=True,
                            action_uuid='update_project',
                            value=model.user.name,
                        ),
                        dict(
                            label='Email',
                            description='config --global user.email',
                            placeholder='e.g. wizard@magic.com',
                            display_settings=dict(
                                icon_uuid='Email',
                            ),
                            name='request.payload.version_control_project.email',
                            type=InteractionInputType.TEXT_FIELD,
                            required=True,
                            monospace=True,
                            action_uuid='update_project',
                            value=model.user.email,
                        ),
                        build_auth_type_settings_input(sync_config),
                    ],
                    uuid='update_project',
                ),
            ],
            actions=[
                dict(
                    request=dict(
                        operation=OperationType.UPDATE,
                        payload=dict(
                            version_control_project=dict(
                                email=None,
                                name=None,
                            ),
                        ),
                        resource='version_control_projects',
                        resource_id=urllib.parse.quote_plus(model.uuid or ''),
                        response_resource_key='version_control_project',
                    ),
                    uuid='update_project',
                ),
            ],
            condition=lambda opts: FilePolicy(
                None,
                opts.get('user'),
            ).has_at_least_editor_role(),
        ),
        git_sync_2_way,
        git_sync_1_way,
    ]

    for item_dict in item_dicts:
        scored = factory.filter_score(item_dict)
        if scored:
            items.append(scored)


async def build_delete_project(factory, model: Project, items: List[Dict]):
    item_dict = dict(
        item_type=ItemType.DELETE,
        object_type=ObjectType.PROJECT,
        title='Delete project',
        uuid=model.uuid,
        actions=[
            dict(
                request=dict(
                    operation=OperationType.DELETE,
                    resource='version_control_projects',
                    resource_id=urllib.parse.quote_plus(model.uuid or ''),
                    response_resource_key='version_control_project',
                ),
                uuid='delete_project',
                validations=[
                    ValidationType.CONFIRMATION,
                ],
            ),
            dict(
                interaction=dict(
                    type=InteractionType.CLOSE_APPLICATION,
                ),
                uuid='close_application',
            ),
            dict(
                interaction=dict(
                    type=InteractionType.FETCH_ITEMS,
                ),
            ),
        ],
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='Trash',
                color_uuid='accent.negative',
            ),
        ),
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    if scored:
        scored['score'] = 0
        items.append(scored)


async def build(factory, project: Project) -> Dict:
    uuid = project.uuid

    project = await add_sync_config(factory, project)
    sync_config = project.sync_config

    return dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.PROJECT,
        title=uuid,
        description=project.repo_path,
        uuid=uuid,
        metadata=dict(
            project=dict(
                repo_path=project.repo_path,
                sync_config=sync_config,
                user=project.user.to_dict() if project.user else None,
                uuid=uuid,
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
                            resource='version_control_projects',
                            resource_id=urllib.parse.quote_plus(uuid or ''),
                            response_resource_key='version_control_project',
                        ),
                        uuid='model_detail',
                    ),
                ],
            ),
            dict(
                uuid='model_detail',
                application_type=ApplicationType.DETAIL,
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.DETAIL,
                            resource='version_control_projects',
                            resource_id=urllib.parse.quote_plus(uuid or ''),
                            response_resource_key='version_control_project',
                        ),
                        uuid='model_detail',
                    ),
                ],
            ),
        ],
    )


async def build_and_score(factory, project: Project, items: List[Dict]):
    scored = factory.filter_score(await build(factory, project))
    if scored:
        items.append(scored)
