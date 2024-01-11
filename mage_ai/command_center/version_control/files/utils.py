import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationExpansionUUID,
    ItemType,
    ObjectType,
    RenderLocationType,
)
from mage_ai.command_center.shared.utils import (
    build_action_fetch_items,
    build_action_generic,
    build_application_detail,
    build_application_detail_list,
    build_application_expansion,
    build_application_form,
    build_generic,
    build_request,
)
from mage_ai.data_preparation.models.file import File as FileModel
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.version_control.models import Branch, File, Project


async def build_diff(factory, model: Branch) -> Dict:
    return build_generic(model_class=File, item_dict=dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.VERSION_CONTROL_FILE,
        title='File differences',
        description='View the file changes made in this branch',
        subtitle='git diff',
        metadata=dict(
            branch=dict(
                current=model.current,
                name=model.name,
            ),
            project=dict(
                repo_path=model.project.repo_path,
                uuid=model.project.uuid,
            ),
        ),
        applications=[
            build_application_expansion(
                model_class=File,
                expansion_settings=dict(
                    uuid=ApplicationExpansionUUID.VersionControlFileDiffs,
                ),
                actions=[
                    build_action_fetch_items({}),
                ],
            ),
        ],
        display_settings_by_attribute=dict(
            description=dict(text_styles=dict(monospace=False)),
            icon=dict(color_uuid='accent.warning', icon_uuid='LayoutSplit'),
            subtitle=dict(
                text_styles=dict(
                    monospace=True,
                ),
            ),
        ),
    ))


async def build_status(factory, model: Branch) -> Dict:
    return build_generic(model_class=File, item_dict=dict(
        item_type=ItemType.ACTION,
        object_type=ObjectType.VERSION_CONTROL_FILE,
        title='File status',
        description='View the status of the current branch',
        subtitle='git status',
        applications=[
            build_application_detail(
                model_class=File,
                actions=[
                    build_action_generic(
                        model_class=File,
                        request=build_request(
                            operation=OperationType.LIST,
                            resource='version_control_files',
                            resource_parent='version_control_projects',
                            resource_parent_id=model.project.uuid,
                            response_resource_key='version_control_files',
                        ),
                    ),
                    build_action_generic(
                        model_class=FileModel,
                        request=build_request(
                            operation=OperationType.LIST,
                            resource='files',
                            response_resource_key='files',
                            query=dict(project_uuid=model.project.uuid, version_control_files=True),
                        ),
                    ),
                ],
            ),
        ],
        display_settings_by_attribute=dict(
            description=dict(text_styles=dict(monospace=False)),
            icon=dict(color_uuid='borders.success', icon_uuid='FileFill'),
            subtitle=dict(
                text_styles=dict(
                    monospace=True,
                ),
            ),
        ),
    ))


async def build_add_staging(factory, model: Branch) -> Dict:
    return build_generic(
        model=model,
        model_class=File,
        item_dict=dict(
            uuid='git_add_all',
            item_type=ItemType.ACTION,
            object_type=ObjectType.VERSION_CONTROL_FILE,
            title='Stage all files',
            description='Add all files to staging',
            subtitle='git add .',
            display_settings_by_attribute=dict(
                description=dict(text_styles=dict(monospace=False)),
                icon=dict(color_uuid='accent.cyan', icon_uuid='Integration'),
                subtitle=dict(
                    text_styles=dict(
                        monospace=True,
                    ),
                ),
            ),
            actions=[
                build_action_generic(
                    model_class=FileModel,
                    request=build_request(
                        operation=OperationType.UPDATE,
                        resource='version_control_files',
                        resource_id='__file__',
                        response_resource_key='version_control_file',
                        resource_parent='version_control_projects',
                        resource_parent_id=urllib.parse.quote_plus(model.project.uuid or ''),
                        payload=dict(
                            version_control_file=dict(add='.'),
                        ),
                    ),
                    render_options=dict(location=RenderLocationType.ITEMS_CONTAINER_AFTER),
                ),
            ],
        ),
    )


async def build_add_staging_selected(factory, model: Branch) -> Dict:
    item_dict = await build_add_staging(factory, model)
    item_dict.update(
        uuid=f'git_add_selected_{model.name}',
        title='Stage selected files',
        description='Select files from the File differences app',
        subtitle='git add [file]',
    )
    item_dict['display_settings_by_attribute']['icon']['color_uuid'] = 'accent.cyanLight'
    item_dict['actions'][0]['request']['payload']['version_control_file'] = dict(add=None)
    item_dict['actions'][0]['application_state_parsers'] = [
        dict(
            positional_argument_names=[
                'item',
                'action',
                'applicationState',
                'options',
            ],
            function_body="""
const names = Object.keys(applicationState?.VersionControlFileDiffs?.files || {})?.join(' ');
action.request.payload.version_control_file.add = names
return action
""",
        ),
    ]

    return item_dict


async def build_reset_all(factory, model: Branch) -> Dict:
    item_dict = await build_add_staging(factory, model)
    item_dict.update(
        uuid=f'git_reset_all_{model.name}',
        title='Reset all files',
        description='Remove all files from staging but keep current modifications',
        subtitle='git reset .',
    )
    item_dict['display_settings_by_attribute']['icon'] = dict(
        color_uuid='accent.warning',
        icon_uuid='Callback',
    )
    item_dict['actions'][0]['request']['payload']['version_control_file'] = dict(
        reset='.',
    )

    return item_dict


async def build_reset_selected(factory, model: Branch) -> Dict:
    item_dict = await build_reset_all(factory, model)
    item_dict.update(
        uuid=f'git_reset_selected_{model.name}',
        title='Reset selected files',
        description='Select files from the File differences app',
        subtitle='git reset [file]',
    )
    item_dict['display_settings_by_attribute']['icon']['color_uuid'] = 'accent.yellow'
    item_dict['actions'][0]['request']['payload']['version_control_file'] = dict(reset=None)
    item_dict['actions'][0]['application_state_parsers'] = [
        dict(
            positional_argument_names=[
                'item',
                'action',
                'applicationState',
                'options',
            ],
            function_body="""
const names = Object.keys(applicationState?.VersionControlFileDiffs?.files || {})?.join(' ');
action.request.payload.version_control_file.reset = names
return action
""",
        ),
    ]

    return item_dict


async def build_log(factory, model: Branch) -> Dict:
    item_dict = await build_add_staging(factory, model)
    item_dict.update(
        uuid=f'git_log_{model.name}',
        title='View recent commit messages',
        subtitle='git log',
    )
    item_dict['display_settings_by_attribute']['icon'] = dict(
        icon_uuid='Logs',
    )
    item_dict['actions'][0]['request']['payload']['version_control_file'] = dict(command='log')

    return item_dict


async def build_checkout_files_application(factory, model: Branch) -> Dict:
    item_dict = await build_add_staging(factory, model)
    item_dict.update(
        uuid=f'git_checkout_single_files_{model.name}',
        title='View unstaged and untracked files to remove modifications',
        subtitle=None,
        description=None,
    )
    item_dict['display_settings_by_attribute']['icon'] = dict(
        color_uuid='accent.pink',
        icon_uuid='AlertTriangle',
    )
    item_dict['actions'] = []
    item_dict['applications'] = [
        build_application_detail_list(
            model_class=File,
        ),
    ]

    return item_dict


async def build_checkout_single_files(factory, model: File, branch: Branch) -> Dict:
    item_dict = await build_add_staging(factory, branch)
    item_dict.update(
        uuid=f'git_checkout_single_files_{model.name}',
        title='Reset all changes to',
        description=model.name,
        subtitle='git checkout',
    )
    item_dict['display_settings_by_attribute'] = dict(
        description=dict(
            text_styles=dict(
                monospace=True,
                regular=True,
            ),
        ),
        subtitle=dict(
            text_styles=dict(
                monospace=True,
            ),
        ),
        icon=dict(
            color_uuid='accent.negative',
            icon_uuid='AlertTriangle',
        ),
    )
    item_dict['actions'][0]['request']['operation'] = OperationType.DELETE
    item_dict['actions'][0]['request']['payload']['version_control_file'] = None
    item_dict['actions'][0]['request']['resource_id'] = urllib.parse.quote_plus(model.name or ''),
    item_dict['actions'] += [
        build_action_fetch_items(
            {}
        ),
    ]

    return item_dict


async def build_commit_files(factory, model: Branch, files: List[File]) -> Dict:
    item_dict = await build_add_staging(factory, model)
    item_dict.update(
        uuid=f'git_commit_files_with_message_{model.name}',
        title='Write a commit message',
        description=f'and save {len(files)} staged files',
        subtitle='git commit',
    )
    item_dict['display_settings_by_attribute']['icon'] = dict(
        color_uuid='background.success',
        icon_uuid='Chat',
    )
    item_dict['actions'][0]['request']['payload']['version_control_file'] = None
    item_dict['applications'] = [
        build_application_form(
            model_class=File,
            settings=[
                dict(
                    label='Commit message',
                    description='Describe the changes that were made to the code.',
                    display_settings=dict(
                        icon_uuid='Chat',
                    ),
                    placeholder='e.g. Optimized a fire spell because it was burning us out.',
                    name='request.payload.version_control_file.commit',
                    type=InteractionInputType.TEXT_FIELD,
                    required=True,
                    action_uuid=item_dict['actions'][0]['uuid'],
                ),
                dict(
                    label='Staged files',
                    text=[file.name for file in files],
                    type=None,
                    display_settings=dict(
                        icon_uuid='File',
                    ),
                    name='__staged_files__',
                    style=dict(
                        default=True,
                        monospace=True,
                    ),
                ),
            ],
        ),
    ]
    item_dict['applications'][0]['buttons'][1]['label'] = 'Create git commit'

    return item_dict


async def build_generic_command(factory, model: Project) -> Dict:
    text = factory.search
    item_dict = await build_add_staging(factory, Branch(project=model, name='generic_command'))
    item_dict.update(
        uuid=f'git_command_{model.uuid}',
        title='Run command',
        description=text,
        subtitle='git [cmd]',
    )
    item_dict['display_settings_by_attribute']['icon'] = dict(
        color_uuid='content.default',
        icon_uuid='Terminal',
    )
    item_dict['actions'][0]['request']['payload']['version_control_file'] = dict(command=text)
    item_dict['display_settings_by_attribute']['description']['text_styles']['small'] = False
    item_dict['display_settings_by_attribute']['description']['text_styles']['regular'] = True

    return item_dict
