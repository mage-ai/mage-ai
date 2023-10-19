from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.services.spark.constants import ComputeService, SparkMaster


def get_compute_service(repo_config=None) -> ComputeService:
    if not repo_config:
        repo_config = get_repo_config()

    if not repo_config:
        return None

    if repo_config.spark_config:
        if repo_config.emr_config:
            return ComputeService.AWS_EMR
        elif SparkMaster.LOCAL.value == repo_config.spark_config.get('spark_master'):
            return ComputeService.STANDALONE_CLUSTER

    return None
