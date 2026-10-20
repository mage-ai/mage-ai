from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
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
        'settings',
        'start_datetime',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ]

    def present(self, **kwargs):
        query = kwargs.get('query', {})
        meta = kwargs.get('meta', {})

        limit = int((meta or {}).get(META_KEY_LIMIT, 40))
        offset = int((meta or {}).get(META_KEY_OFFSET, 0))

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
            data['run_status_counts'] = self.model.pipeline_run_status_counts
            if include_preview_runs:
                start_idx = offset
                end_idx = start_idx + limit
                data['pipeline_run_dates'] = pipeline_run_dates[start_idx:(end_idx + 1)]

        return data
