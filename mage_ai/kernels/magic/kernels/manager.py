import threading
from typing import Optional

import psutil

from mage_ai.data.models.generator import DataGenerator
from mage_ai.kernels.default.models import KernelProcess
from mage_ai.kernels.default.utils import get_process_info
from mage_ai.kernels.magic.kernels.models import Kernel
from mage_ai.kernels.magic.models import Kernel as KernelDetails
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
        kernels = []

        for kernel_id, kernel in KernelManager.kernels.items():
            processes = []
            for process in kernel.pool:
                try:
                    info = get_process_info(process.pid)
                    if info:
                        processes.append(KernelProcess.load(**info))
                except psutil.NoSuchProcess:
                    # In case the process ends and no longer exists
                    continue
            kernels.append(
                KernelDetails(
                    kernel_id=kernel_id,
                    processes=processes,
                )
            )

        return DataGenerator(kernels)

    @staticmethod
    def interrupt_kernel(uuid: str) -> None:
        KernelManager.__update_kernel_state(uuid, interrupt=True)

    @staticmethod
    def terminate_kernel(uuid: str) -> None:
        KernelManager.__update_kernel_state(uuid, terminate=True)

    @staticmethod
    def restart_kernel(uuid: str, num_processes: Optional[int] = None) -> None:
        KernelManager.__update_kernel_state(uuid, num_processes=num_processes, restart=True)

    @staticmethod
    def __update_kernel_state(
        uuid: str,
        interrupt: Optional[bool] = None,
        num_processes: Optional[int] = None,
        restart: Optional[bool] = None,
        terminate: Optional[bool] = None,
    ) -> None:
        if uuid in KernelManager.kernels:
            if interrupt:
                KernelManager.kernels[uuid].interrupt()
            elif restart:
                KernelManager.kernels[uuid].restart(num_processes=num_processes)
            elif terminate:
                KernelManager.kernels[uuid].terminate()
                del KernelManager.kernels[uuid]

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
