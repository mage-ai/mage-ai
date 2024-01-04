from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.version_control.shared.utils import (
    build_action_generic,
    build_application_detail,
    build_application_expansion,
    build_generic,
    build_request,
)
from mage_ai.data_preparation.models.file import File as FileModel
from mage_ai.version_control.models import Branch, File


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
                    uuid='VersionControlFileDiffs',
                ),
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
