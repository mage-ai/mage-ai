from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineSchedulePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'description',
        'global_data_product_uuid',
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

    async def prepare_present(self, **kwargs):
        display_format = kwargs['format']

        if display_format in [constants.DETAIL, constants.UPDATE]:
            data = self.model.to_dict(include_attributes=[
                'event_matchers',
            ])
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = self.model.next_execution_date()

            return data
        elif 'with_runtime_average' == display_format:
            data = self.model.to_dict()
            data['runtime_average'] = self.model.runtime_average()
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = self.model.next_execution_date()
        elif isinstance(self.model, dict):
            data = self.model
        else:
            data = self.model.to_dict()

        return data


PipelineSchedulePresenter.register_format(
    constants.LIST,
    PipelineSchedulePresenter.default_attributes + [
        'event_matchers',
        'last_pipeline_run_status',
        'next_pipeline_run_date',
        'pipeline_in_progress_runs_count',
        'pipeline_runs_count',
        'tags',
    ],
)

PipelineSchedulePresenter.register_formats([
    constants.DETAIL,
    constants.UPDATE,
], PipelineSchedulePresenter.default_attributes + [
        'event_matchers',
        'next_pipeline_run_date',
        'tags',
    ],
)


PipelineSchedulePresenter.register_formats([
    'with_runtime_average',
], PipelineSchedulePresenter.default_attributes + [
        'next_pipeline_run_date',
        'runtime_average',
        'tags',
    ],
)


PipelineSchedulePresenter.register_formats(
    [
        f'integration_source/{constants.DETAIL}',
    ],
    [
        'id',
        'name',
        'schedule_interval',
        'schedule_type',
        'settings',
        'variables',
    ],
)
