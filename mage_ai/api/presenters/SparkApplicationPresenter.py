from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkApplicationPresenter(BasePresenter):
    default_attributes = [
        'attempts',
        'id',
        'name',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
