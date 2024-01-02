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

    actions = []
    applications = []
    if model.current:
        applications.append(
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
        )
    else:
        description = 'switch to make this the current branch'
        actions.extend([
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
                    type=InteractionType.SELECT_ITEM,
                ),
                uuid='select_item',
            ),
        ])

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
                project_uuid=project.uuid,
                remote=model.remote,
                repo_path=model.repo_path,
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
        actions=actions,
        applications=applications,
    )


async def build_and_score(factory, model: Branch, items: List[Dict]):
    scored = factory.filter_score(await build(factory, model))
    if scored:
        items.append(scored)
