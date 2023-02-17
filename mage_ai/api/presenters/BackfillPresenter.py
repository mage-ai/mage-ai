from mage_ai.api.presenters.BasePresenter import BasePresenter


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
        return self.model.to_dict()
