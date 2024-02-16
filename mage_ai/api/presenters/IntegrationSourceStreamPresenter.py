from mage_ai.api.errors import ApiError
from mage_ai.api.presenters.BasePresenter import BasePresenter


class IntegrationSourceStreamPresenter(BasePresenter):
    default_attributes = [
        'streams',
        'uuid',
    ]

    def present(self, **kwargs):
        try:
            streams = self.resource.model.discover_streams() or {}
        except Exception as ex:
            error = ApiError.RESOURCE_ERROR.copy()
            error.update(
                message='Error discovering streams',
                errors=dict(
                    error=str(ex),
                ),
            )
            raise ApiError(error)

        return dict(
            streams=sorted(streams, key=lambda x: x['tap_stream_id']),
            uuid=self.resource.model.source_uuid,
        )
