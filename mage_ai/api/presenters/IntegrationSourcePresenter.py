from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.block.data_integration.utils import discover


class IntegrationSourcePresenter(BasePresenter):
    default_attributes = [
        'name',
        'templates',
        'uuid',
    ]

    def present(self, **kwargs):
        if constants.UPDATE == kwargs['format']:
            payload = kwargs.get('payload', {})

            catalog = None
            data_integration_uuid = None
            selected_streams = payload.get('integration_source', {}).get('streams')

            block_uuid = payload.get('block_uuid')
            if block_uuid:
                block = self.model.get_block(block_uuid)
                if block.is_data_integration() and block.is_source():
                    data_integration_settings = block.get_data_integration_settings(
                        from_notebook=True,
                        global_vars=block.pipeline.variables if block.pipeline else None,
                    )

                    config = data_integration_settings.get('config')
                    data_integration_uuid = data_integration_settings.get('data_integration_uuid')
                    catalog = discover(
                        data_integration_uuid,
                        config=config,
                        streams=selected_streams,
                    )
            else:
                catalog = self.model.discover(streams=selected_streams) or {}
                data_integration_uuid = self.model.source_uuid

            return dict(
                selected_streams=selected_streams,
                streams=catalog.get('streams', []),
                uuid=data_integration_uuid,
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
