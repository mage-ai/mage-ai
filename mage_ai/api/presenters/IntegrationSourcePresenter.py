from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover,
    get_selected_streams,
    update_metadata_in_stream,
)


class IntegrationSourcePresenter(BasePresenter):
    default_attributes = [
        'block',
        'name',
        'partition',
        'pipeline_run',
        'pipeline_schedule',
        'streams',
        'templates',
        'uuid',
    ]

    async def prepare_present(self, **kwargs):
        display_format = kwargs['format']

        if constants.UPDATE == display_format:
            payload = (kwargs.get('payload') or {}).get('integration_source') or {}

            catalog = None
            data_integration_uuid = None
            selected_streams = payload.get('streams')

            block_uuid = payload.get('block_uuid')
            if block_uuid:
                block = self.model.get_block(block_uuid)
                if block.is_data_integration():
                    variables = block.pipeline.variables if block.pipeline else None

                    data_integration_settings = block.get_data_integration_settings(
                        from_notebook=True,
                        global_vars=variables,
                    )

                    config = data_integration_settings.get('config')
                    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

                    if block.is_source():
                        catalog = discover(
                            data_integration_uuid,
                            config=config,
                            streams=selected_streams,
                        )
                    else:
                        upstream_block_uuids = \
                            [i for i
                                in block.upstream_block_uuids
                                if i not in block.inputs_only_uuids]

                        input_vars_fetched, kwargs_vars, up_block_uuids = \
                            block.fetch_input_variables_and_catalog(
                                None,
                                all_catalogs=True,
                                all_streams=True,
                                from_notebook=True,
                                global_vars=variables,
                                upstream_block_uuids=upstream_block_uuids,
                            )

                        catalog = dict(streams=[])

                        for idx, up_uuid in enumerate(up_block_uuids):
                            if idx >= len(input_vars_fetched):
                                continue

                            data, cat = input_vars_fetched[idx]
                            if cat:
                                for stream_dict in get_selected_streams(cat):
                                    stream_dict['parent_stream'] = up_uuid
                                    catalog['streams'].append(
                                        update_metadata_in_stream(stream_dict, dict(
                                            selected=False,
                                        )),
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
