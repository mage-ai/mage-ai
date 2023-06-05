from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockOutputPresenter(BasePresenter):
    default_attributes = [
        'outputs',
    ]

    def present(self, **kwargs):
        display_format = kwargs['format']

        if display_format == constants.CREATE:
            pipeline = kwargs.get('parent_model')
            outputs_path = pipeline.outputs_path

            return dict(outputs_path=outputs_path)
        elif display_format == constants.DETAIL:
            return super().present(**kwargs)
