from enum import Enum
from jupyter_client import KernelManager
from jupyter_client.session import Session

from mage_ai.data_preparation.models.constants import PipelineType


class KernelName(str, Enum):
    PYSPARK = 'pysparkkernel'
    PYTHON3 = 'python3'


PIPELINE_TO_KERNEL_NAME = {
    PipelineType.INTEGRATION: KernelName.PYTHON3,
    PipelineType.PYTHON: KernelName.PYTHON3,
    PipelineType.PYSPARK: KernelName.PYSPARK,
    PipelineType.STREAMING: KernelName.PYTHON3,
}


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
