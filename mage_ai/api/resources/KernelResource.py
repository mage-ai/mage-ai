from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.active_kernel import (
    interrupt_kernel,
    restart_kernel,
    start_kernel,
    switch_active_kernel,
)
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName, kernel_managers


class KernelResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        kernels = []

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels.append(kernel)

        return self.build_result_set(
            kernels,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        kernels_by_id = {}

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels_by_id[kernel.kernel_id] = kernel

        kernel = kernels_by_id.get(pk) or kernel_managers[DEFAULT_KERNEL_NAME]

        return self(kernel, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        action_type = payload.get('action_type')

        switch_active_kernel(self.model.kernel_name)

        if 'interrupt' == action_type:
            interrupt_kernel()
        elif 'restart' == action_type:
            try:
                restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    start_kernel()

        return self
