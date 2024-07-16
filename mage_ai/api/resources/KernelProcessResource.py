from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.constants import KernelOperation
from mage_ai.kernels.magic.kernels.manager import KernelManager


class KernelProcessResource(GenericResource):
    @classmethod
    async def collection(cls, _query, _meta, user, **kwargs):
        return cls.build_result_set(KernelManager.kernels.values(), user, **kwargs)

    @classmethod
    async def member(cls, pk, user, **kwargs):
        if pk not in KernelManager.kernels:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **dict(message=f'Process {pk} not found.'),
            })
        kernel = KernelManager.kernels[pk]
        return cls(kernel, user, **kwargs)

    async def update(self, payload, **kwargs):
        if payload.get(KernelOperation.INTERRUPT, False):
            await KernelManager.interrupt_kernel_async(self.model.uuid)
        elif payload.get(KernelOperation.RESTART, False):
            num_processes = payload.get('num_processes', None)
            await KernelManager.restart_kernel_async(self.model.uuid, num_processes=num_processes)
        return self

    async def delete(self, **kwargs):
        await KernelManager.terminate_kernel_async(self.model.uuid)
