import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.orchestration.db.models.schedules import PipelineSchedule


def add_application_actions(item_dict: Dict) -> Dict:
    model = item_dict['metadata']['trigger']
    model_id = model['id']
    pipeline_uuid = model['pipeline_uuid']

    application_action = dict(
        request=dict(
            operation=OperationType.DETAIL,
            resource='pipeline_schedules',
            resource_id=model_id,
            response_resource_key='pipeline_schedule',
            resource_parent='pipelines',
            resource_parent_id=urllib.parse.quote_plus(pipeline_uuid),
            query=dict(
                _format='with_runtime_average',
            ),
        ),
        uuid='model_detail',
    )

    return dict(
        applications=[
            dict(
                application_type=ApplicationType.DETAIL,
                action=application_action,
                buttons=[
                    dict(
                        label='Open trigger',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.CUSTOM_ACTIONS,
                        ],
                        actions=[
                            dict(
                                page=dict(
                                    path=f'/pipelines/{pipeline_uuid}/triggers/{model_id}',
                                ),
                                uuid='open_model',
                            ),
                        ],
                    ),
                ],
                uuid='model_detail',
            ),
        ],
    )


async def build_and_score(
    factory,
    model: PipelineSchedule,
    items: List[Dict],
    add_application: bool = False,
):
    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.TRIGGER,
        title=model.name,
        description=model.description or ' '.join([s for s in [
            model.schedule_type,
            model.schedule_interval,
            model.status,
        ] if s]),
        uuid=f'{model.id}-{model.pipeline_uuid}-{model.repo_path}',
        metadata=dict(
            trigger=dict(
                description=model.description,
                global_data_product_uuid=model.global_data_product_uuid,
                id=model.id,
                pipeline_uuid=model.pipeline_uuid,
                repo_path=model.repo_path,
                schedule_interval=model.schedule_interval,
                schedule_type=model.schedule_type,
                settings=model.settings,
                sla=model.sla,
                start_time=model.start_time,
                status=model.status,
                variables=model.variables,
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
    )

    if add_application:
        item_dict.update(add_application_actions(item_dict))

    scored = factory.filter_score(item_dict)
    if scored:
        items.append(scored)
