import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import ApplicationType, ItemType, ObjectType
from mage_ai.version_control.models import Project


async def build_and_score(factory, project: Project, items: List[Dict]):
    uuid = project.uuid

    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.PROJECT,
        title=uuid,
        description=project.repo_path,
        uuid=uuid,
        metadata=dict(
            project=dict(
                repo_path=project.repo_path,
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

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)
