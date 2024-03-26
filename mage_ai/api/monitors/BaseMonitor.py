import asyncio

from mage_ai.api.errors import ApiError
from mage_ai.shared.hash import extract
from mage_ai.usage_statistics.constants import EventNameType
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class BaseMonitor:
    def __init__(self, resource, user, error, **kwargs):
        self.error = error
        self.options = kwargs
        self.resource = resource
        self.user = user

    def present(self):
        data = ApiError.RESOURCE_ERROR.copy()
        if self.error.code:
            data['code'] = self.error.code
        if self.error.errors:
            data['errors'] = self.error.errors
        if self.error.message:
            data['message'] = self.error.message
        if self.error.type:
            data['type'] = self.error.type

        kwargs = dict(
            resource=self.resource,
            **extract(
                data,
                [
                    'code',
                    'errors',
                    'message',
                    'type',
                ],
            ),
            **extract(
                self.options,
                [
                    'operation',
                    'resource_id',
                    'resource_parent',
                    'resource_parent_id',
                ],
            ),
        )

        loop = asyncio.get_event_loop()
        if loop is not None:
            loop.create_task(
                UsageStatisticLogger().error(
                    EventNameType.API_ERROR,
                    **kwargs
                )
            )
        else:
            asyncio.run(
                UsageStatisticLogger().error(
                    EventNameType.API_ERROR,
                    **kwargs
                )
            )

        return data
