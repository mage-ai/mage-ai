from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.constants import ComputeService
from mage_ai.services.spark.utils import get_compute_service


class API:
    @classmethod
    def build(self, all_applications: bool = False, repo_config=None, spark_session=None):
        compute_service = get_compute_service(repo_config)

        if ComputeService.STANDALONE_CLUSTER == compute_service:
            return LocalAPI(all_applications=all_applications, spark_session=spark_session)
