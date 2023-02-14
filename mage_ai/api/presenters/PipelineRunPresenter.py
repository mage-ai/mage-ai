from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineRunPresenter(BasePresenter):
    default_attributes = [
        'backfill_id',
        'completed_at',
        'created_at',
        'event_variables',
        'execution_date',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_uuid',
        'status',
        'updated_at',
        'variables',
    ]

    async def present(self, **kwargs):
        if constants.LIST == kwargs['format']:
            return self.model.to_dict(include_attributes=[
                'block_runs',
                'block_runs_count',
                'pipeline_schedule_name',
                'pipeline_schedule_token',
                'pipeline_schedule_type',
            ])

        return self.model.to_dict()


PipelineRunPresenter.register_format(
    constants.LIST,
    PipelineRunPresenter.default_attributes + [
        'block_runs',
        'block_runs_count',
        'pipeline_schedule_name',
        'pipeline_schedule_token',
        'pipeline_schedule_type',
    ],
)
