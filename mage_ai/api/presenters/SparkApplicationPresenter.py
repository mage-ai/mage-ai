from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkApplicationPresenter(BasePresenter):
    default_attributes = [
        'attempts',
        'id',
        'name',
        'spark_ui_url',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
