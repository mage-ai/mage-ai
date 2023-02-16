from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockRunPresenter(BasePresenter):
    default_attributes = [
        'block_uuid',
        'completed_at',
        'created_at',
        'id',
        'metrics',
        'pipeline_run_id',
        'pipeline_schedule_id',
        'pipeline_schedule_name',
        'started_at',
        'status',
        'updated_at',
    ]

    def present(self, **kwargs):
        return self.model.to_dict()
