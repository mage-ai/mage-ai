from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineSchedulePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'id',
        'name',
        'pipeline_uuid',
        'repo_path',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'token',
        'updated_at',
        'variables',
    ]

    async def present(self, **kwargs):
        if constants.LIST == kwargs['format']:
            return self.model.to_dict(include_attributes=[
                'event_matchers',
                'last_pipeline_run_status',
                'pipeline_runs_count',
            ])
        elif kwargs['format'] in [constants.DETAIL, constants.UPDATE]:
            return self.model.to_dict(include_attributes=[
                'event_matchers',
            ])

        return self.model.to_dict()


PipelineSchedulePresenter.register_format(
    constants.LIST,
    PipelineSchedulePresenter.default_attributes + [
        'event_matchers',
        'last_pipeline_run_status',
        'pipeline_runs_count',
    ],
)

PipelineSchedulePresenter.register_formats([
    constants.DETAIL,
    constants.UPDATE,
], PipelineSchedulePresenter.default_attributes + [
        'event_matchers',
    ],
)
