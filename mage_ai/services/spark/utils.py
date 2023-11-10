from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.server.active_kernel import get_active_kernel_name
from mage_ai.server.kernels import KernelName
from mage_ai.services.spark.constants import ComputeService, SparkMaster
from mage_ai.shared.utils import is_spark_env


def get_compute_service(repo_config=None) -> ComputeService:
    if not repo_config:
        repo_config = get_repo_config()

    if not repo_config:
        return None

    if repo_config.emr_config and get_active_kernel_name() == KernelName.PYSPARK:
        return ComputeService.AWS_EMR
    elif is_spark_env() and repo_config.spark_config and \
            SparkMaster.LOCAL.value == repo_config.spark_config.get('spark_master'):
        return ComputeService.STANDALONE_CLUSTER

    return None
