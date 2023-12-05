from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkThreadPresenter(BasePresenter):
    default_attributes = [
        'blocked_by_lock',
        'holding_locks',
        'stack_trace',
        'thread_id',
        'thread_name',
        'thread_state',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
