from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    ItemType,
    ObjectType,
)
from mage_ai.data_preparation.models.constants import (
    PIPELINE_TYPE_DISPLAY_NAME_MAPPING,
    PipelineType,
)
from mage_ai.presenters.interactions.constants import InteractionInputType

ITEMS = [
    dict(
        item_type=ItemType.CREATE,
        object_type=ObjectType.PIPELINE,
        title='Create a new pipeline',
        display_settings_by_attribute=dict(
            icon=dict(
                icon_uuid='PipelineV2',
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
                        label='Create pipeline',
                        tooltip='Save changes and create the new pipeline.',
                        keyboard_shortcuts=[[13]],
                        action_types=[
                            ButtonActionType.EXECUTE,
                            ButtonActionType.RESET_FORM,
                            ButtonActionType.CLOSE_APPLICATION,
                            ButtonActionType.CLOSE_COMMAND_CENTER,
                        ],
                    ),
                ],
                settings=[
                    dict(
                        label='Name',
                        description='A unique and descriptive name of the pipeline to be created.',
                        placeholder='e.g. core data users',
                        display_settings=dict(
                            icon_uuid='PipelineV3',
                        ),
                        name='request.payload.pipeline.name',
                        type=InteractionInputType.TEXT_FIELD,
                        required=True,
                        monospace=True,
                        action_uuid='create_model',
                    ),
                    dict(
                        label='Type',
                        description='The type of pipeline to be created.',
                        placeholder='e.g. Batch',
                        name='request.payload.pipeline.type',
                        type=InteractionInputType.DROPDOWN_MENU,
                        options=[dict(
                            label=PIPELINE_TYPE_DISPLAY_NAME_MAPPING[pipeline_type],
                            value=pipeline_type,
                        ) for pipeline_type in PipelineType if (
                            pipeline_type in PIPELINE_TYPE_DISPLAY_NAME_MAPPING
                        )],
                        value=PipelineType.PYTHON.value,
                        required=True,
                        monospace=True,
                        action_uuid='create_model',
                    ),
                ],
                uuid='model_detail_list',
            ),
        ],
        actions=[
            dict(
                request=dict(
                    operation=OperationType.CREATE,
                    payload=dict(
                        pipeline=dict(
                            name=None,
                            type=None,
                        ),
                    ),
                    resource='pipelines',
                    response_resource_key='pipeline'
                ),
                uuid='create_model',
            ),
            dict(
                upstream_action_value_key_mapping=dict(
                    create_model={
                        'pipeline.uuid': 'page.parameters.uuid',
                    }
                ),
                page=dict(
                    path='/pipelines/:uuid/edit',
                    parameters=dict(
                        uuid=None,
                    ),
                ),
                uuid='open_model',
            ),
        ],
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
    ),
]
