from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class IntegrationSourcePresenter(BasePresenter):
    default_attributes = [
        'name',
        'templates',
        'uuid',
    ]

    def present(self, **kwargs):
        if constants.UPDATE == kwargs['format']:
            payload = kwargs.get('payload', {})
            selected_streams = payload.get('integration_source', {}).get('streams')
            catalog = self.model.discover(streams=selected_streams) or {}

            return dict(
                selected_streams=selected_streams,
                streams=catalog.get('streams', []),
                uuid=self.model.source_uuid,
            )

        return self.model


IntegrationSourcePresenter.register_format(
    constants.CREATE,
    [
        'error_message',
        'streams',
        'success',
    ],
)

IntegrationSourcePresenter.register_format(
    constants.UPDATE,
    [
        'selected_streams',
        'streams',
        'uuid',
    ],
)
