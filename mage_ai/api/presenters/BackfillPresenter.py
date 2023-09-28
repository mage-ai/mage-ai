from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.orchestration.backfills.service import preview_run_dates


class BackfillPresenter(BasePresenter):
    default_attributes = [
        'block_uuid',
        'completed_at',
        'created_at',
        'end_datetime',
        'failed_at',
        'id',
        'interval_type',
        'interval_units',
        'metrics',
        'name',
        'pipeline_schedule_id',
        'pipeline_uuid',
        'start_datetime',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ]

    def present(self, **kwargs):
        query = kwargs.get('query', {})

        data = self.model.to_dict()

        include_preview_runs = query.get('include_preview_runs', [False])
        include_run_count = query.get('include_run_count', [False])
        if include_preview_runs:
            include_preview_runs = include_preview_runs[0]
        if include_run_count:
            include_run_count = include_run_count[0]
        if (
            (include_preview_runs or include_run_count) and
            self.model.start_datetime is not None and
            self.model.end_datetime is not None and
            self.model.interval_type is not None and
            self.model.interval_units is not None
        ):
            pipeline_run_dates = preview_run_dates(self.model)
            data['total_run_count'] = len(pipeline_run_dates)
            if include_preview_runs:
                data['pipeline_run_dates'] = pipeline_run_dates

        return data
