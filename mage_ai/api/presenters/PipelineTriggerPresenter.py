from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineTriggerPresenter(BasePresenter):
    default_attributes = [
        'envs',
        'name',
        'pipeline_uuid',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'variables',
    ]

    async def prepare_present(self, **kwargs):
        return self.resource.model.to_dict()
