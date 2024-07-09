import os
from datetime import datetime

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.magic.kernels.manager import KernelManager
from mage_ai.settings.repo import get_variables_dir
from mage_ai.shared.environments import is_debug


class CodeExecutionResource(GenericResource):
    @classmethod
    async def create(cls, payload, user, **kwargs) -> GenericResource:
        now = datetime.utcnow()
        if is_debug():
            print('[CodeExecutionResource.create]', now.timestamp())

        message = payload.get('message', '')
        message_request_uuid = payload.get('message_request_uuid')
        num_processes = payload.get('num_processes', None)
        uuid = payload.get('uuid')

        if uuid is None:
            error = ApiError(ApiError.RESOURCE_INVALID)
            error.message = 'UUID is required'
            raise error

        output_file = None
        output_dir = payload.get('output_dir', None)
        if output_dir is not None:
            output_file = os.path.join(
                get_variables_dir(),
                'code_executions',
                output_dir,
                message_request_uuid or str(int(now.timestamp())),
            )
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

        kernel = KernelManager.get_kernel(uuid, num_processes=num_processes)
        process = kernel.run(
            message,
            message_request_uuid=message_request_uuid,
            output_file=output_file,
            source=payload.get('source'),
            stream=payload.get('stream'),
            timestamp=now.timestamp(),
        )

        if is_debug():
            print(f'[CodeExecutionResource.create] Process {process.message_uuid} started')
        return cls(process, user, **kwargs)
