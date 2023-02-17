from mage_ai.api.presenters.BasePresenter import BasePresenter


class KernelPresenter(BasePresenter):
    default_attributes = [
        'alive',
        'id',
        'name',
    ]

    def present(self, **kwargs):
        return dict(
            alive=self.resource.model.is_alive(),
            id=self.resource.model.kernel_id,
            name=self.resource.model.kernel_name,
        )
