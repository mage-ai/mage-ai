from datetime import datetime

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.magic.manager import Manager
from mage_ai.shared.environments import is_debug


class ServerSentEventResource(GenericResource):
    @classmethod
    async def collection(cls, query, _meta, user, **kwargs):
        uuid = query.get('uuid', [None])
        if uuid:
            uuid = uuid[0]

        arr = []

        if uuid is not None:
            mapping = Manager.processes.get(uuid)
            if mapping is not None:
                arr = list(sorted(mapping.values(), key=lambda process: process.timestamp))

        return cls.build_result_set(arr, user, **kwargs)

    @classmethod
    async def create(cls, payload, user, **kwargs) -> GenericResource:
        now = datetime.utcnow().timestamp()
        if is_debug():
            print('[ServerSentEventResource.create]', now)

        message = payload.get('message', '')
        message_request_uuid = payload.get('message_request_uuid')
        uuid = payload.get('uuid')

        if uuid is None:
            error = ApiError(ApiError.RESOURCE_INVALID)
            error.message = 'UUID is required'
            raise error

        manager = Manager.get_instance(uuid, timestamp=now)
        process = manager.create_process(
            uuid,
            message,
            message_request_uuid=message_request_uuid,
            timestamp=now,
        )
        manager.start_processes(uuid, [process], timestamp=now)

        # async def _on_create_callback(resource):
        #     Manager.cleanup_resources()

        # cls.on_create_callback = _on_create_callback

        if is_debug():
            print(f'[ServerSentEventResource.create] Process {process.message_uuid} started')
        return cls(process, user, **kwargs)

    @classmethod
    async def member(cls, pk, user, **kwargs) -> GenericResource:
        process = Manager.get_process(pk)

        if process is None:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = f'Process {pk} not found'
            raise error

        return cls(process, user, **kwargs)
