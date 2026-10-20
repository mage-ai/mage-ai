from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.settings.server import HIDE_API_TRIGGER_TOKEN


class PipelineSchedulePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'description',
        'global_data_product_uuid',
        'id',
        'last_enabled_at',
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
        elif 'with_runtime_average' == display_format:
            data = self.model.to_dict()
            data['runtime_average'] = self.model.runtime_average()
            data['tags'] = sorted([tag.name for tag in self.get_tag_associations])
            data['next_pipeline_run_date'] = self.model.next_execution_date()

            if constants.DETAIL == kwargs.get('api_operation_action'):
                data['pipeline_runs_count'] = len(self.model.pipeline_runs)
        elif isinstance(self.model, dict):
            data = self.model
        else:
            data = self.model.to_dict()

        if display_format == constants.UPDATE:
            rotate_token = kwargs.get(
                'payload', dict(),
            ).get(
                'pipeline_schedule', dict(),
            ).get('rotate_token')
        else:
            rotate_token = False
        if HIDE_API_TRIGGER_TOKEN and not rotate_token:
            data['token'] = '[API_TOKEN_PLACEHOLDER]'
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
        'pipeline_runs_count',
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
