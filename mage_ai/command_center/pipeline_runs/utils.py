from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule


def add_application_actions(item_dict: Dict) -> Dict:
    model = item_dict['metadata']['pipeline_run']
    model_id = model['id']
    pipeline_uuid = model['pipeline_uuid']

    return dict(
        applications=[
            dict(
                application_type=ApplicationType.DETAIL,
                actions=[
                    dict(
                        request=dict(
                            operation=OperationType.DETAIL,
                            resource='pipeline_runs',
                            resource_id=model_id,
                            response_resource_key='pipeline_run',
                        ),
                        uuid='model_detail',
                    ),
                    dict(
                        request=dict(
                            operation=OperationType.LIST,
                            resource='block_runs',
                            response_resource_key='block_runs',
                            query=dict(
                                _limit=100,
                                _offset=0,
                                pipeline_run_id=model_id,
                            ),
                        ),
                        uuid='list_block_runs',
                    ),
                    dict(
                        request=dict(
                            operation=OperationType.LIST,
                            resource='blocks',
                            response_resource_key='blocks',
                            resource_parent='pipeline_runs',
                            resource_parent_id=model_id,
                            query=dict(
                                _limit=100,
                            ),
                        ),
                        uuid='list_blocks',
                    ),
                ],
                buttons=[
                    dict(
                        label='Open run',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.CUSTOM_ACTIONS,
                        ],
                        actions=[
                            dict(
                                page=dict(
                                    path=f'/pipelines/{pipeline_uuid}/runs/{model_id}',
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
    model: PipelineRun,
    parent_model: PipelineSchedule,
    items: List[Dict],
    add_application: bool = False,
):
    description = str(model.status)

    if model.completed_at:
        description = f'{description} on {model.completed_at.isoformat()}'
    elif model.started_at:
        description = f'{description} after starting on {model.started_at.isoformat()}'
    elif model.execution_partition:
        description = f'{description} with execution partition {model.execution_partition}'
    elif model.execution_date:
        description = f'{description} with execution date {model.execution_date.isoformat()}'

    item_dict = dict(
        item_type=ItemType.DETAIL,
        object_type=ObjectType.PIPELINE_RUN,
        title=f'Run {model.id} for trigger {parent_model.name or model.pipeline_schedule_id}',
        description=description,
        uuid=f'{model.pipeline_uuid}-{model.pipeline_schedule_id}-{model.id}',
        metadata=dict(
            pipeline_run=dict(
                backfill_id=model.backfill_id,
                completed_at=model.completed_at.isoformat() if model.completed_at else None,
                execution_date=model.execution_date.isoformat() if model.execution_date else None,
                execution_partition=model.execution_partition,
                executor_type=model.executor_type,
                id=model.id,
                metrics=model.metrics,
                passed_sla=model.passed_sla,
                pipeline_schedule_id=model.pipeline_schedule_id,
                pipeline_uuid=model.pipeline_uuid,
                started_at=model.started_at.isoformat() if model.started_at else None,
                status=model.status,
            ),
            trigger=dict(
                description=parent_model.description,
                name=parent_model.name,
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
