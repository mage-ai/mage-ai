import asyncio
import threading
from typing import Optional

from mage_ai.data.models.generator import DataGenerator
from mage_ai.kernels.magic.kernels.models import Kernel
from mage_ai.kernels.magic.queues.manager import get_execution_result_queue
from mage_ai.shared.environments import is_debug


class KernelNotFound(Exception):
    pass


class KernelManager:
    _instance = None
    _lock = threading.Lock()
    kernels = {}

    @staticmethod
    def get_kernel(
        uuid: str, existing_only: Optional[bool] = None, num_processes: Optional[int] = None
    ) -> Kernel:
        if uuid not in KernelManager.kernels:
            if existing_only:
                raise KernelNotFound(f'Kernel {uuid} not found.')

            KernelManager.kernels[uuid] = Kernel(
                uuid,
                get_execution_result_queue(uuid),
                num_processes=num_processes,
            )

        return KernelManager.kernels[uuid]

    @staticmethod
    def get_kernels() -> DataGenerator:
        return DataGenerator([k.details for k in KernelManager.kernels.values()])

    @staticmethod
    async def interrupt_kernel_async(uuid: str) -> None:
        await KernelManager.__update_kernel_state(uuid, interrupt=True)

    @staticmethod
    async def terminate_kernel_async(uuid: str) -> None:
        await KernelManager.__update_kernel_state(uuid, terminate=True)

    @staticmethod
    async def restart_kernel_async(uuid: str, num_processes: Optional[int] = None) -> None:
        await KernelManager.__update_kernel_state(uuid, num_processes=num_processes, restart=True)

    @staticmethod
    async def __update_kernel_state(
        uuid: str,
        interrupt: Optional[bool] = None,
        num_processes: Optional[int] = None,
        restart: Optional[bool] = None,
        terminate: Optional[bool] = None,
    ) -> None:
        if uuid not in KernelManager.kernels:
            print(f'[KernelManager] Kernel {uuid} not found.')
            return

        timeout = 10  # Timeout in seconds
        kernel = KernelManager.kernels[uuid]

        try:
            if interrupt:
                await kernel.interrupt_async()
            elif restart:
                await kernel.restart_async(num_processes=num_processes)
            elif terminate:
                print(f'[KernelManager] Terminating kernel: {uuid}')
                try:
                    await asyncio.wait_for(kernel.terminate_async(), timeout)
                    print(f'[KernelManager] Kernel {uuid} terminated successfully.')
                except asyncio.TimeoutError:
                    print(
                        f'[KernelManager] Timeout occurred while terminating kernel {uuid}. '
                        'Forcefully terminating.'
                    )
                    kernel.force_terminate()
        except asyncio.TimeoutError:
            print(f'[KernelManager] Timeout occurred while terminating kernel {uuid}.')
        except Exception as e:
            print(f'[KernelManager] Error while terminating kernel {uuid}: {e}')
        finally:
            if terminate:
                if uuid in KernelManager.kernels:
                    del KernelManager.kernels[uuid]
                    print(f'[KernelManager] Kernel {uuid} removed from manager.')

    def __init__(self):
        if is_debug():
            print('[Manager.get_instance] New instance created')

    @classmethod
    def instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()

            if is_debug():
                print('[Manager.get_instance] Returning existing instance')

            return cls._instance
