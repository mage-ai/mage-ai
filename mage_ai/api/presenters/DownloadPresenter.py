from mage_ai.api.presenters.BasePresenter import BasePresenter


class DownloadPresenter(BasePresenter):
    default_attributes = [
        'token',
        'uri',
    ]

    def present(self, **kwargs):
        if type(self.model) is dict:
            return self.model

        return self.model.to_dict()
