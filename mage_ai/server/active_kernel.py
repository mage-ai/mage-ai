from jupyter_client import KernelClient, KernelManager
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName, kernel_managers


class ActiveKernel():
    def __init__(self):
        self.kernel = kernel_managers[DEFAULT_KERNEL_NAME]
        self.kernel_client = self.kernel.client()


active_kernel = ActiveKernel()


def switch_active_kernel(kernel_name: KernelName) -> None:
    if kernel_managers[kernel_name].is_alive():
        return

    for kernel in kernel_managers.values():
        if kernel.is_alive():
            kernel.request_shutdown()

    new_kernel = kernel_managers[kernel_name]
    new_kernel.start_kernel()
    active_kernel.kernel = new_kernel
    active_kernel.kernel_client = new_kernel.client()


def get_active_kernel() -> KernelManager:
    return active_kernel.kernel


def get_active_kernel_name() -> str:
    return active_kernel.kernel.kernel_name
 

def get_active_kernel_client() -> KernelClient:
    return active_kernel.kernel_client


def interrupt_kernel() -> None:
    active_kernel.kernel.interrupt_kernel()


def restart_kernel() -> None:
    active_kernel.kernel.restart_kernel()
    active_kernel.kernel_client = active_kernel.kernel.client()


def start_kernel() -> None:
    active_kernel.kernel.start_kernel()
    active_kernel.kernel_client = active_kernel.kernel.client()
