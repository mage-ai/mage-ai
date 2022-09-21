from jupyter_client import KernelClient, KernelManager
from jupyter_client.kernelspec import NoSuchKernel
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName, kernel_managers


class ActiveKernel():
    def __init__(self):
        self.kernel = kernel_managers[DEFAULT_KERNEL_NAME]
        self.kernel_client = self.kernel.client()


active_kernel = ActiveKernel()


def switch_active_kernel(kernel_name: KernelName) -> None:
    print(f'Switch active kernel: {kernel_name}')
    if kernel_managers[kernel_name].is_alive():
        print(f'Kernel {kernel_name} is already alive.')
        return

    for kernel in kernel_managers.values():
        if kernel.is_alive():
            print(f'Shut down current kernel {kernel}.')
            kernel.request_shutdown()

    try:
        new_kernel = kernel_managers[kernel_name]
        new_kernel.start_kernel()
        active_kernel.kernel = new_kernel
        active_kernel.kernel_client = new_kernel.client()
        if kernel_name == KernelName.PYSPARK:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            emr_cluster_manager.set_active_cluster(auto_selection=True)
    except NoSuchKernel as e:
        if kernel_name == KernelName.PYSPARK:
            raise Exception(
                'PySpark kernel is not installed. Please follow the instructions in '
                'https://github.com/mage-ai/mage-ai/blob/master/docs/spark/setup/README.md '
                'to install it.'
            ) from e
        else:
            raise e


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
