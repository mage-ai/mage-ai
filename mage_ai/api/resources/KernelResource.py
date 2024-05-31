from datetime import datetime

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.kernels.constants import KernelOperation
from mage_ai.kernels.default.models import KernelProcess, KernelWrapper
from mage_ai.kernels.default.utils import find_ipykernel_launchers_info_async
from mage_ai.kernels.magic.kernels.manager import KernelManager
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName, kernel_managers
from mage_ai.services.ssh.aws.emr.utils import tunnel
from mage_ai.settings.server import KERNEL_MAGIC, MEMORY_MANAGER_V2


class KernelResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(cls, query, meta, user, **kwargs):
        kernels = []

        if KERNEL_MAGIC:
            for kernel_details in KernelManager.get_kernels():
                await kernel_details.hydrate_processes()
                kernels.append(kernel_details)

        if Project().is_feature_enabled(FeatureUUID.AUTOMATIC_KERNEL_CLEANUP):
            # Only do this every minute
            if int(datetime.utcnow().timestamp()) % 60 == 0:
                kill_count, memory_freed = KernelProcess.terminate_inactive(
                    await find_ipykernel_launchers_info_async(),
                )
                if kill_count >= 1:
                    print(
                        f'[KernelResource] Automatic kernel cleanup: {kill_count} '
                        f'kernels terminated, {(memory_freed / 1024**3):.3f} '
                        'GBs if memory freed.'
                    )

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels.append(KernelWrapper(kernel))

        return cls.build_result_set(
            kernels,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def member(cls, pk, user, **kwargs):
        if KERNEL_MAGIC:
            if pk in KernelManager.kernels:
                kernel = KernelManager.get_kernel(pk, existing_only=True)
                return cls(kernel.details, user, **kwargs)

        kernel_fallback = None
        kernels_by_id = {}

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels_by_id[kernel.kernel_id] = kernel

                if not kernel_fallback:
                    kernel_fallback = kernel

        kernel = kernels_by_id.get(pk)
        if not kernel:
            kernel = kernel_fallback
        if not kernel:
            kernel = kernel_managers[DEFAULT_KERNEL_NAME]

        return cls(KernelWrapper(kernel), user, **kwargs)

    @safe_db_query
    async def update(self, payload, **kwargs):
        action_type = KernelOperation.from_value(payload.get('action_type'))

        if KERNEL_MAGIC:
            uuid = self.model.kernel_id
            if uuid in KernelManager.kernels:
                if KernelOperation.INTERRUPT == action_type:
                    await KernelManager.interrupt_kernel_async(uuid)
                elif KernelOperation.RESTART == action_type:
                    num_processes = payload.get('num_processes', None)
                    await KernelManager.restart_kernel_async(uuid, num_processes=num_processes)
                elif KernelOperation.TERMINATE == action_type:
                    await KernelManager.terminate_kernel_async(uuid)
                return self

        switch_active_kernel(self.model.kernel_name)

        if MEMORY_MANAGER_V2:
            from mage_ai.shared.singletons.memory import get_memory_manager_controller

            get_memory_manager_controller().stop_all_events()

        if KernelOperation.INTERRUPT == action_type:
            self.model.interrupt()
        elif KernelOperation.RESTART == action_type:
            try:
                self.model.restart()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    self.model.start()

        def _callback(*args, **kwargs):
            tunnel(
                kernel_name=self.model.kernel_name,
                reconnect=True,
                validate_conditions=True,
            )

        self.on_update_callback = _callback

        return self
