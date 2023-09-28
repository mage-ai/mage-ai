from mage_ai.api.presenters.BasePresenter import BasePresenter


class IntegrationSourceStreamPresenter(BasePresenter):
    default_attributes = [
        'streams',
        'uuid',
    ]

    def present(self, **kwargs):
        streams = self.resource.model.discover_streams() or {}

        return dict(
            streams=sorted(streams, key=lambda x: x['tap_stream_id']),
            uuid=self.resource.model.source_uuid,
        )
