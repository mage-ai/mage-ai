from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.version_control.shared.utils import (
    build_action_generic,
    build_application_detail,
    build_generic,
    build_request,
)
from mage_ai.version_control.models import Branch, File


async def build_status(factory, model: Branch) -> Dict:
    return build_generic(model_class=File, item_dict=dict(
        item_type=ItemType.ACTION,
        object_type=ObjectType.FILE,
        title='View the status of files in this branch',
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
                            response_resource_key='version_control_file',
                        ),
                    ),
                ],
            ),
        ],
        display_settings_by_attribute=dict(
            subtitle=dict(
                text_styles=dict(
                    monospace=True,
                ),
            ),
        ),
    ))
