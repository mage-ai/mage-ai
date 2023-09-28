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

    async def present(self, **kwargs):
        display_format = kwargs['format']
        data = self.model.to_dict()
        next_execution_date = self.model.next_execution_date()

        if constants.LIST == display_format:
            data = self.model.to_dict(include_attributes=[
                'event_matchers',
                'last_pipeline_run_status',
                'pipeline_runs_count',
            ])
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = next_execution_date

            return data
        elif display_format in [constants.DETAIL, constants.UPDATE]:
            data = self.model.to_dict(include_attributes=[
                'event_matchers',
            ])
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = next_execution_date

            return data
        elif 'with_runtime_average' == display_format:
            data['runtime_average'] = self.model.runtime_average()
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = next_execution_date

        return data


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
