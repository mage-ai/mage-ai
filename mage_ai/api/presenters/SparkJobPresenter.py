from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkJobPresenter(BasePresenter):
    default_attributes = [
        'application',
        'completion_time',
        'job_id',
        'job_tags',
        'killed_tasks_summary',
        'name',
        'num_active_stages',
        'num_active_tasks',
        'num_completed_indices',
        'num_completed_stages',
        'num_completed_tasks',
        'num_failed_stages',
        'num_failed_tasks',
        'num_killed_tasks',
        'num_skipped_stages',
        'num_skipped_tasks',
        'num_tasks',
        'stage_ids',
        'status',
        'submission_time',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
