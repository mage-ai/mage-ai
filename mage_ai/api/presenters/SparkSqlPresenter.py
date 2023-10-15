from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkSqlPresenter(BasePresenter):
    default_attributes = [
        'description',
        'duration',
        'edges',
        'failed_job_ids',
        'id',
        'nodes',
        'plan_description',
        'running_job_ids',
        'status',
        'submission_time',
        'success_job_ids',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
