from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.magic.manager import Manager


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
        message = payload.get('message', '')
        message_request_uuid = payload.get('message_request_uuid')
        uuid = payload.get('uuid')

        if uuid is None:
            error = ApiError(ApiError.RESOURCE_INVALID)
            error.message = 'UUID is required'
            raise error

        from mage_ai.kernels.magic.queues.results import get_results_queue

        process = Manager(uuid).start_process(
            message=message,
            message_request_uuid=message_request_uuid,
            queue=get_results_queue(),
        )

        async def _on_create_callback(resource):
            Manager.cleanup_processes()

        cls.on_create_callback = _on_create_callback

        return cls(process, user, **kwargs)

    @classmethod
    async def member(cls, pk, user, **kwargs) -> GenericResource:
        process = Manager.get_process(pk)

        if process is None:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = f'Process {pk} not found'
            raise error

        return cls(process, user, **kwargs)
