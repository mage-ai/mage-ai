from typing import Dict

from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.server.kernels import KernelName
from mage_ai.services.spark.constants import ComputeServiceUUID, SparkMaster
from mage_ai.shared.utils import is_spark_env


def get_compute_service(
    emr_config: Dict = None,
    repo_config=None,
    ignore_active_kernel: bool = False,
    kernel_name: KernelName = None,
) -> ComputeServiceUUID:
    print('------------------------------- get_compute_service')
    print('arguments:')
    print('repo_config', repo_config)
    print('ignore_active_kernel', ignore_active_kernel)
    print('kernel_name', kernel_name)
    if not repo_config:
        repo_config = get_repo_config()

    if repo_config and emr_config:
        repo_config.emr_config = emr_config

    print('repo_config', repo_config)

    if not repo_config:
        # This is probably happening because there is no repo config in Spark EMR
        print('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! NO repo_config')
        return None

    if not kernel_name:
        from mage_ai.server.active_kernel import get_active_kernel_name

        kernel_name = get_active_kernel_name()
        print('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! NO kernel_name', kernel_name)

    print('repo_config.emr_config', repo_config.emr_config)
    print('is_spark_env', is_spark_env())
    print('repo_config.spark_config', repo_config.spark_config)

    if repo_config.emr_config and (KernelName.PYSPARK == kernel_name or ignore_active_kernel):
        print('WTFFFFFFFFFFFFFFFFFFFFFFFF', ComputeServiceUUID.AWS_EMR)
        return ComputeServiceUUID.AWS_EMR
    elif is_spark_env() and repo_config.spark_config and \
            SparkMaster.LOCAL.value == repo_config.spark_config.get('spark_master'):

        print('WTFFFFFFFFFFFFFFFFFFFFFFFF', ComputeServiceUUID.STANDALONE_CLUSTER)
        return ComputeServiceUUID.STANDALONE_CLUSTER

    print('WTFFFFFFFFFFFFFFFFFFFFFFFF None')
    return None
