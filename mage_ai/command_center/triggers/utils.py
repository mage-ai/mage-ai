import urllib.parse
from datetime import datetime
from typing import Dict, List
from uuid import uuid4

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.command_center.models import TriggerMetadata
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    SCHEDULE_TYPE_TO_LABEL,
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.presenters.interactions.constants import InteractionInputType


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
                application_type=ApplicationType.DETAIL_LIST,
                actions=[application_action],
                uuid='model_detail_list',
            ),
            dict(
                application_type=ApplicationType.DETAIL,
                actions=[application_action],
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
            SCHEDULE_TYPE_TO_LABEL.get(model.schedule_type),
            model.schedule_interval,
            model.status,
        ] if s]),
        uuid=f'{model.id}-{model.pipeline_uuid}-{model.repo_path}',
        metadata=dict(
            trigger=dict(
                description=model.description,
                global_data_product_uuid=model.global_data_product_uuid,
                id=model.id,
                name=model.name,
                pipeline_uuid=model.pipeline_uuid,
                repo_path=model.repo_path,
                schedule_interval=model.schedule_interval,
                schedule_type=model.schedule_type,
                settings=model.settings,
                sla=model.sla,
                start_time=model.start_time,
                status=model.status,
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


async def build_create_and_score(factory, model: Pipeline) -> Dict:
    item_dict = dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.TRIGGER,
        title='Create new trigger',
        description=f'Create a new trigger for pipeline {model.name or model.uuid}',
        uuid=f'{model.uuid}_{ItemType.CREATE}_{ObjectType.TRIGGER}',
        metadata=dict(
            pipeline=dict(
                repo_path=model.repo_path,
                uuid=model.uuid,
            ),
        ),
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='accent.negative',
                icon_uuid='Lightning',
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
                        label='Create trigger',
                        tooltip='Save changes and create the new trigger.',
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
                        placeholder='e.g. Daily ETL',
                        display_settings=dict(
                            icon_uuid='Alphabet',
                        ),
                        name='request.payload.pipeline_schedule.name',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        action_uuid='create_model',
                    ),
                    dict(
                        label='Description',
                        placeholder='e.g. Runs daily for global users.',
                        display_settings=dict(
                            icon_uuid='Alphabet',
                        ),
                        name='request.payload.pipeline_schedule.description',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        action_uuid='create_model',
                    ),
                    dict(
                        label='Type',
                        description='The type of trigger to create.',
                        placeholder='e.g. Schedule',
                        name='request.payload.pipeline_schedule.schedule_type',
                        type=InteractionInputType.DROPDOWN_MENU,
                        options=[dict(
                            label=SCHEDULE_TYPE_TO_LABEL[schedule_type],
                            value=schedule_type,
                        ) for schedule_type in ScheduleType if (
                            schedule_type in SCHEDULE_TYPE_TO_LABEL
                        )],
                        value=ScheduleType.TIME.value,
                        required=True,
                        action_uuid='create_model',
                    ),
                ],
                uuid='model_create',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        pipeline_schedule=dict(
                            description=None,
                            name=None,
                            schedule_type=None,
                        ),
                    ),
                    resource='pipeline_schedules',
                    response_resource_key='pipeline_schedule',
                    resource_parent='pipelines',
                    resource_parent_id=urllib.parse.quote_plus(model.uuid),
                ),
                uuid='create_model',
            ),
            dict(
                upstream_action_value_key_mapping=dict(
                    create_model={
                        'pipeline_schedule.id': 'page.parameters.pipeline_schedule_id',
                    }
                ),
                page=dict(
                    path=(
                        f'/pipelines/{urllib.parse.quote_plus(model.uuid)}'
                        '/triggers/:pipeline_schedule_id/edit'
                    ),
                    parameters=dict(
                        pipeline_schedule_id=None,
                    ),
                ),
                uuid='open_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    if scored:
        return


async def build_run_once_and_score(factory, model: Pipeline) -> Dict:
    item_dict = dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.TRIGGER,
        title='Trigger pipeline once',
        description=f'Run pipeline {model.name or model.uuid} once',
        uuid=f'{model.uuid}_{ItemType.CREATE}_{ObjectType.TRIGGER}',
        metadata=dict(
            pipeline=dict(
                repo_path=model.repo_path,
                uuid=model.uuid,
            ),
        ),
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='accent.negative',
                icon_uuid='Lightning',
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
                        label='Trigger pipeline',
                        tooltip='Run pipeline now.',
                        keyboard_shortcuts=[[18, 13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                            ButtonActionType.RESET_FORM,
                            ButtonActionType.CLOSE_APPLICATION,
                        ],
                    ),
                ],
                settings=[
                    dict(
                        label='Variables (optional)',
                        description='JSON containing variables for this pipeline run.',
                        name='request.payload.pipeline_schedule.variables',
                        type=InteractionInputType.CODE,
                        action_uuid='create_model',
                        style=dict(
                            language='json',
                        ),
                    ),
                ],
                uuid='model_create',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        pipeline_schedule=dict(
                            name=f'Run once {uuid4().hex[:5]}',
                            schedule_interval=ScheduleInterval.ONCE,
                            schedule_type=ScheduleType.TIME,
                            start_time=datetime.now().isoformat(),
                            status=ScheduleStatus.ACTIVE,
                            variables=None,
                        ),
                    ),
                    resource='pipeline_schedules',
                    response_resource_key='pipeline_schedule',
                    resource_parent='pipelines',
                    resource_parent_id=urllib.parse.quote_plus(model.uuid),
                ),
                uuid='create_model',
            ),
            dict(
                upstream_action_value_key_mapping=dict(
                    create_model={
                        'pipeline_schedule.id': 'page.parameters.pipeline_schedule_id',
                    }
                ),
                page=dict(
                    path=(
                        f'/pipelines/{urllib.parse.quote_plus(model.uuid)}'
                        '/triggers/:pipeline_schedule_id'
                    ),
                    parameters=dict(
                        pipeline_schedule_id=None,
                    ),
                ),
                uuid='open_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    return scored


async def build_create_pipeline_run_once(factory, model: TriggerMetadata) -> Dict:
    item_dict = dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.PIPELINE_RUN,
        title='Run trigger once',
        description=f'Create a 1 time run for trigger {model.name or model.id}',
        uuid=f'{model.id}_{ItemType.CREATE}_{ObjectType.PIPELINE_RUN}',
        metadata=dict(
            trigger=model.to_dict(),
        ),
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='accent.negative',
                icon_uuid='Lightning',
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
                        label='Run now',
                        tooltip='Run this trigger now.',
                        keyboard_shortcuts=[[18, 13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                            ButtonActionType.RESET_FORM,
                            ButtonActionType.CLOSE_APPLICATION,
                        ],
                    ),
                ],
                settings=[
                    dict(
                        label='Variables (optional)',
                        description='JSON containing variables for this pipeline run.',
                        name='request.payload.pipeline_run.variables',
                        type=InteractionInputType.CODE,
                        action_uuid='create_model',
                        style=dict(
                            language='json',
                        ),
                    ),
                ],
                uuid='model_create',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        pipeline_run=dict(
                            pipeline_schedule_id=model.id,
                            pipeline_uuid=model.pipeline_uuid,
                            variables=None,
                        ),
                    ),
                    resource='pipeline_runs',
                    response_resource_key='pipeline_run',
                    resource_parent='pipeline_schedules',
                    resource_parent_id=model.id,
                ),
                uuid='create_model',
            ),
            dict(
                upstream_action_value_key_mapping=dict(
                    create_model={
                        'pipeline_run.id': 'page.parameters.pipeline_run_id',
                    }
                ),
                page=dict(
                    path=(
                        f'/pipelines/{urllib.parse.quote_plus(model.pipeline_uuid)}'
                        '/runs/:pipeline_run_id'
                    ),
                    parameters=dict(
                        pipeline_run_id=None,
                    ),
                ),
                uuid='open_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    )

    scored = factory.filter_score(item_dict)
    return scored
