from jupyter_client import KernelManager
from jupyter_client.session import Session

DEFAULT_KERNEL_NAME = 'python3'

kernel_managers = dict(
    python3=KernelManager(
        session=Session(key=bytes()),
    ),
    pysparkkernel=KernelManager(
        kernel_name='pysparkkernel',
        session=Session(key=bytes()),
    ),
)
