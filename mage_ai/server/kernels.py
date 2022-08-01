from enum import Enum
from jupyter_client import KernelManager
from jupyter_client.session import Session

import os


class KernelName(str, Enum):
    PYSPARK = 'pysparkkernel'
    PYTHON3 = 'python3'


DEFAULT_KERNEL_NAME = KernelName.PYTHON3

kernel_managers = dict(
    python3=KernelManager(
        session=Session(key=bytes()),
    ),
    pysparkkernel=KernelManager(
        kernel_name='pysparkkernel',
        session=Session(key=bytes()),
    ),
)

class TestKernel():
    def __init__(self):
        self.active_kernel = kernel_managers[DEFAULT_KERNEL_NAME]
    
test_kernel = TestKernel()

def switch_active_kernel(kernel_name: KernelName):
    if kernel_managers[kernel_name].is_alive():
        return

    for kernel in kernel_managers.values():
        if kernel.is_alive():
            kernel.request_shutdown()

    kernel_managers[kernel_name].start_kernel()
    test_kernel.active_kernel = kernel_managers[kernel_name]
    