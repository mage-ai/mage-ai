from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.spark.utils import get_compute_service


class API:
    @classmethod
    def build(
        self,
        all_applications: bool = True,
        application_id: str = None,
        application_spark_ui_url: str = None,
        repo_config=None,
        spark_session=None,
    ) -> BaseAPI:
        compute_service = get_compute_service(repo_config, ignore_active_kernel=True)

        if ComputeServiceUUID.STANDALONE_CLUSTER == compute_service:
            return LocalAPI(
                all_applications=all_applications,
                spark_session=spark_session,
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
            )
        elif ComputeServiceUUID.AWS_EMR == compute_service:
            from mage_ai.services.spark.api.aws_emr import AwsEmrAPI

            return AwsEmrAPI(
                all_applications=all_applications,
                spark_session=spark_session,
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
            )
