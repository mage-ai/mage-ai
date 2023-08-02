from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import extract


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
        display_format = kwargs['format']
        data = self.model.to_dict()

        if constants.LIST == display_format:
            data = self.model.to_dict(include_attributes=[
                'event_matchers',
                'last_pipeline_run_status',
                'pipeline_runs_count',
            ])
        elif display_format in [constants.DETAIL, constants.UPDATE]:
            data = self.model.to_dict(include_attributes=[
                'event_matchers',
            ])
        elif 'with_runtime_average' == display_format:
            data['runtime_average'] = self.model.runtime_average()

        keys = self.formats(display_format)

        return extract(data, keys)


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


PipelineSchedulePresenter.register_formats([
    'with_runtime_average',
], PipelineSchedulePresenter.default_attributes + [
        'runtime_average',
    ],
)
