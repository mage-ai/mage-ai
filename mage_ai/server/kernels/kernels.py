from jupyter_client import KernelManager
from jupyter_client.session import Session

kernel_managers = dict(
    python3=KernelManager(
        session=Session(key=bytes()),
    ),
    pysparkkernel=KernelManager(
        kernel_name='pysparkkernel',
        session=Session(key=bytes()),
    ),
    pipeline=KernelManager(
        kernel_name='pipeline',
        session=Session(key=bytes()),
    ),
)
