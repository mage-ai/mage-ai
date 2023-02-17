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
        elif constants.DETAIL == kwargs['format']:
            block_runs = self.model.block_runs
            data = self.model.to_dict()
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

PipelineRunPresenter.register_format(
    constants.DETAIL,
    PipelineRunPresenter.default_attributes + [
        'block_runs',
    ],
)
