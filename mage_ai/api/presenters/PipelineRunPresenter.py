from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineRunPresenter(BasePresenter):
    default_attributes = [
        'backfill_id',
        'completed_at',
        'created_at',
        'event_variables',
        'execution_date',
        'executor_type',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_uuid',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ]

    async def prepare_present(self, **kwargs):
        display_format = kwargs.get('format')
        data_to_display = self.model

        if constants.LIST == display_format:
            query = kwargs.get('query', {})

            additional_attributes = [
                'block_runs',
                'block_runs_count',
                'completed_block_runs_count',
                'pipeline_schedule_name',
                'pipeline_schedule_token',
                'pipeline_schedule_type',
            ]

            include_pipeline_type = query.get('include_pipeline_type', [False])
            if include_pipeline_type:
                include_pipeline_type = include_pipeline_type[0]

            pipeline_type = query.get('pipeline_type', [None])
            if pipeline_type:
                pipeline_type = pipeline_type[0]

            include_pipeline_tags = query.get('include_pipeline_tags', [False])
            if include_pipeline_tags:
                include_pipeline_tags = include_pipeline_tags[0]

            if include_pipeline_type or pipeline_type is not None:
                additional_attributes.append('pipeline_type')

            if include_pipeline_tags:
                additional_attributes.append('pipeline_tags')

            return data_to_display.to_dict(include_attributes=additional_attributes)
        elif constants.DETAIL == display_format:
            block_runs = data_to_display.block_runs
            data = data_to_display.to_dict()
            pipeline_schedule = self.resource.pipeline_schedule

            arr = []
            for r in block_runs:
                block_run = r.to_dict()
                block_run['pipeline_schedule_id'] = pipeline_schedule.id
                block_run['pipeline_schedule_name'] = pipeline_schedule.name
                arr.append(block_run)
            arr.sort(key=lambda b: b.get('created_at'))
            data['block_runs'] = arr

            return data
        elif 'with_basic_details' == display_format:
            data = data_to_display.to_dict()

            return dict(
                execution_date=data.get('execution_date'),
                id=data.get('id'),
                status=data.get('status'),
            )

        return data_to_display.to_dict()


PipelineRunPresenter.register_format(
    constants.LIST,
    PipelineRunPresenter.default_attributes + [
        'block_runs',
        'block_runs_count',
        'completed_block_runs_count',
        'pipeline_schedule_name',
        'pipeline_schedule_token',
        'pipeline_schedule_type',
        'pipeline_tags',
        'pipeline_type',
    ],
)

PipelineRunPresenter.register_format(
    constants.DETAIL,
    PipelineRunPresenter.default_attributes + [
        'block_runs',
    ],
)

PipelineRunPresenter.register_formats(
    [
        f'integration_source/{constants.DETAIL}',
        'with_basic_details',
    ],
    [
        'execution_date',
        'id',
        'status',
    ],
)
