from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.magic.environments.models import Environment
from mage_ai.kernels.magic.kernels.manager import KernelManager


class CodeExecutionResource(GenericResource):
    @classmethod
    async def create(cls, payload, user, **kwargs) -> GenericResource:
        uuid = payload.get('uuid')
        if uuid is None:
            error = ApiError(ApiError.RESOURCE_INVALID)
            error.message = 'UUID is required'
            raise error

        environment = Environment.load(**(payload.get('environment') or {}))

        kernel = KernelManager.get_kernel(uuid, num_processes=payload.get('num_processes', None))

        process = await environment.run_process(
            kernel,
            message=payload.get('message', ''),
            message_request_uuid=payload.get('message_request_uuid'),
            output_path=payload.get('output_path'),
            process_options=dict(
                source=payload.get('source'),
                stream=payload.get('stream'),
            ),
        )

        return cls(process, user, **kwargs)
