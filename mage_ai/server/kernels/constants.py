from enum import Enum

from mage_ai.data_preparation.models.constants import PipelineType


class KernelName(str, Enum):
    PYSPARK = 'pysparkkernel'
    PYTHON3 = 'python3'


PIPELINE_TO_KERNEL_NAME = {
    PipelineType.INTEGRATION: KernelName.PYTHON3,
    PipelineType.DATABRICKS: KernelName.PYTHON3,
    PipelineType.PYTHON: KernelName.PYTHON3,
    PipelineType.PYSPARK: KernelName.PYSPARK,
    PipelineType.STREAMING: KernelName.PYTHON3,
}


DEFAULT_KERNEL_NAME = KernelName.PYTHON3
