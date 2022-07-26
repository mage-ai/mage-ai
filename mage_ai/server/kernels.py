from enum import Enum
from jupyter_client import KernelManager
from jupyter_client.session import Session


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
